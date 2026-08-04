// Packs the web export into a single self-contained HTML file, for sharing a
// clickable preview of the app before a native build exists.
//
// Run from mobile/:
//   npx expo export --platform web --output-dir dist-preview
//   node scripts/build-preview.mjs [outFile]
//
// Everything is inlined — the JS bundle, the navigation chrome's icons, and
// (best effort) the cover art, which is normally fetched at runtime from
// Wikimedia / Open Library / etc. Inlining the covers matters because the page
// is meant to be viewable somewhere those hosts may be blocked; where a fetch
// fails the app falls back to its own typographic cover, exactly as it does
// offline on device.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, "..");
const dist = join(mobileRoot, "dist-preview");
const outFile = process.argv[2] ?? join(mobileRoot, "preview.html");

const COVER_WIDTH = 260;
const FETCH_TIMEOUT_MS = 12000;
const CONCURRENCY = 8;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

function dataUri(mime, buffer) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

// --- the bundle ------------------------------------------------------------
const files = await walk(dist);
const bundlePath = files.find((f) => f.endsWith(".js") && f.includes("/_expo/static/js/web/"));
if (!bundlePath) throw new Error("no web bundle in dist-preview — run expo export first");
let bundle = await readFile(bundlePath, "utf8");

// --- local assets (navigation icons, header logo) --------------------------
let inlinedAssets = 0;
for (const path of files.filter((f) => f.endsWith(".png") && f.includes("/assets/"))) {
  const url = "/" + path.slice(dist.length + 1);
  if (!bundle.includes(url)) continue;
  bundle = bundle.split(url).join(dataUri("image/png", await readFile(path)));
  inlinedAssets += 1;
}

// --- cover art -------------------------------------------------------------
const data = JSON.parse(await readFile(join(mobileRoot, "src", "data", "app-data.json"), "utf8"));
const covers = [...new Set(data.resources.map((r) => r.image).filter(Boolean))];

async function fetchCover(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    // Re-encode small: a full-size cover is ~300KB and the page holds 100+.
    const jpeg = await sharp(input)
      .resize({ width: COVER_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer();
    return dataUri("image/jpeg", jpeg);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let fetched = 0;
let failed = 0;
const queue = [...covers];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let url = queue.pop(); url; url = queue.pop()) {
      const uri = await fetchCover(url);
      if (uri) {
        bundle = bundle.split(url).join(uri);
        fetched += 1;
      } else {
        failed += 1;
      }
    }
  })
);

// --- assemble --------------------------------------------------------------
// No <html>/<head>/<body> wrapper: the host page supplies those.
//
// Two things the wrapper has to solve that the app doesn't have to on device:
//
// 1. Theme. react-native-web's useColorScheme reads the prefers-color-scheme
//    media query only, but a viewer looking at this page may switch themes with
//    a control that sets data-theme on the root element. The shim below makes
//    matchMedia answer for data-theme when it's set, and re-notifies the app's
//    listeners when it changes, so dark mode is actually testable here.
// 2. Width. A phone layout stretched across a desktop window says nothing
//    useful, so wide viewports get a device-sized frame and narrow ones (an
//    actual phone) run full-bleed.
const themeShim = `
(function () {
  // This page contributes no <head>. If the host page didn't set a viewport
  // meta, a phone lays out at ~980px and renders the app shrunk to illegibility.
  // Only fills the gap — never overrides a meta the host already set.
  if (!document.querySelector('meta[name="viewport"]')) {
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, shrink-to-fit=no';
    (document.head || document.documentElement).appendChild(meta);
  }
})();

(function () {
  var root = document.documentElement;
  var native = window.matchMedia.bind(window);
  var emitters = [];
  function forced() {
    var value = root.getAttribute('data-theme');
    return value === 'dark' ? true : value === 'light' ? false : null;
  }
  window.matchMedia = function (query) {
    if (!/prefers-color-scheme/.test(query)) return native(query);
    var wantsDark = /dark/.test(query);
    var base = native(query);
    var listeners = [];
    var proxy = {
      media: query,
      onchange: null,
      get matches() {
        var override = forced();
        return override === null ? base.matches : override === wantsDark;
      },
      addEventListener: function (type, fn) { if (type === 'change') listeners.push(fn); },
      removeEventListener: function (type, fn) {
        listeners = listeners.filter(function (x) { return x !== fn; });
      },
      addListener: function (fn) { listeners.push(fn); },
      removeListener: function (fn) {
        listeners = listeners.filter(function (x) { return x !== fn; });
      },
      dispatchEvent: function () { return true; }
    };
    function emit() {
      var event = { matches: proxy.matches, media: query };
      listeners.forEach(function (fn) { try { fn(event); } catch (e) {} });
      if (typeof proxy.onchange === 'function') { try { proxy.onchange(event); } catch (e) {} }
    }
    base.addEventListener('change', emit);
    emitters.push(emit);
    return proxy;
  };
  new MutationObserver(function () {
    emitters.forEach(function (emit) { emit(); });
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
`;

// Surround tokens only — everything inside the frame is the app's own palette
// from src/theme.ts. The ground is a deeper, desaturated relative of the site's
// cream so the device reads as sitting on a surface rather than dissolving into
// one.
const html = `<title>AI Safety Resources — preview</title>
<style>
  :root {
    --surround: #d9d1c2;
    --frame-edge: rgba(56, 33, 16, 0.18);
    --frame-shadow: rgba(56, 33, 16, 0.22);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --surround: #0b0907;
      --frame-edge: rgba(237, 228, 211, 0.16);
      --frame-shadow: rgba(0, 0, 0, 0.6);
    }
  }
  :root[data-theme="light"] {
    --surround: #d9d1c2;
    --frame-edge: rgba(56, 33, 16, 0.18);
    --frame-shadow: rgba(56, 33, 16, 0.22);
  }
  :root[data-theme="dark"] {
    --surround: #0b0907;
    --frame-edge: rgba(237, 228, 211, 0.16);
    --frame-shadow: rgba(0, 0, 0, 0.6);
  }

  html, body { height: 100%; margin: 0; overflow: hidden; }
  /* react-native-web needs a full-height flex root to fill its viewport. */
  #root { display: flex; height: 100%; flex: 1; }

  /* Frame the app only on something with a real mouse. Width alone can't be
     trusted here: this page contributes no <head>, so if the host doesn't set a
     viewport meta a phone reports a ~980px layout width and would wrongly take
     the desktop branch. A fine pointer means a desktop either way. */
  @media (min-width: 760px) and (hover: hover) and (pointer: fine) {
    body {
      background: var(--surround);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }
    #root {
      width: 400px;
      flex: none;
      height: min(860px, 100% - 8px);
      border-radius: 34px;
      overflow: hidden;
      border: 1px solid var(--frame-edge);
      box-shadow: 0 24px 60px -12px var(--frame-shadow);
    }
  }
</style>
<div id="root"></div>
<script>
${themeShim}
</script>
<script>
${bundle}
</script>
`;

await writeFile(outFile, html, "utf8");
const mb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
console.log(`inlined ${inlinedAssets} local assets, ${fetched} covers (${failed} unavailable)`);
console.log(`wrote ${outFile} — ${mb} MB`);
