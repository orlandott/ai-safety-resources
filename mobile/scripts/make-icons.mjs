// Generates the app's icon set from the vector mark defined below.
// Run from mobile/: `node scripts/make-icons.mjs`.
//
// The mark is a flat redraw of the site's robot emblem. The original artwork is
// a 677x250 landscape illustration: it can't fill a square without leaving most
// of the canvas empty, and its line detail turns to mud below about 60pt, which
// is what the icon actually renders at on a home screen. So the robot is rebuilt
// here from rounded rectangles — same face, same cyan eyes, same gold crest —
// as a shape that survives being shrunk to 29px.
//
// Every output is that one mark on one green ground, so the iOS icon, the
// Android adaptive icon, the web favicon, the store listings, and the in-app
// header logo all read as the same app.
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");

// Site palette (public/style.css) plus the emblem's own cyan and gold.
const CREAM = "#f4f1ea";
const GREEN = "#2f7a52";
const GREEN_LIGHT = "#3c9265";
const GREEN_DARK = "#17492f";
const GOLD = "#c8a45c";
const CYAN = "#6fe3dd";
const INK = "#12100d";

// --- the mark -------------------------------------------------------------
// Drawn in a local box spanning x 36..564 (528 wide) and y 0..478, then scaled
// and centred into the 1000-unit icon canvas by `mark()`.
const ROBOT_W = 528;
const ROBOT_H = 478;
const ROBOT_X = 36;

// `mouth` is separate from `trim` only so the monochrome variant can knock it
// out; everywhere else it takes the crest's colour.
function shapes({ body, eye, trim, mouth = trim }) {
  return `
    <rect x="268" y="0"   width="64"  height="78"  rx="16" fill="${trim}"/>
    <rect x="36"  y="196" width="72"  height="150" rx="26" fill="${body}"/>
    <rect x="492" y="196" width="72"  height="150" rx="26" fill="${body}"/>
    <rect x="88"  y="58"  width="424" height="420" rx="96" fill="${body}"/>
    <rect x="168" y="188" width="112" height="70"  rx="30" fill="${eye}"/>
    <rect x="320" y="188" width="112" height="70"  rx="30" fill="${eye}"/>
    <rect x="216" y="344" width="168" height="52"  rx="20" fill="${mouth}"/>`;
}

/**
 * The mark centred in a `size` square, occupying `fill` of its width.
 * `inner` lets a caller substitute differently-coloured shapes.
 */
function mark({ size, fill = 0.72, inner }) {
  const scale = (fill * 1000) / ROBOT_W;
  const x = (1000 - fill * 1000) / 2 - ROBOT_X * scale;
  const y = (1000 - ROBOT_H * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
    <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">${inner}</g>
  </svg>`;
}

/** Full-bleed background: a soft diagonal gradient so the tile isn't flat. */
function gradient(width, height, from, to) {
  return `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>`;
}

/**
 * An icon tile. Returns a PNG with no alpha channel — iOS rejects app icons
 * that carry one.
 */
async function tile(
  size,
  { from = GREEN_LIGHT, to = GREEN_DARK, body = CREAM, eye = CYAN, trim = GOLD, fill = 0.72 } = {}
) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
    ${gradient(1000, 1000, from, to)}
  </svg>`;
  const art = mark({ size, fill, inner: shapes({ body, eye, trim }) });
  return sharp(Buffer.from(svg))
    .composite([{ input: Buffer.from(art) }])
    .flatten({ background: from })
    .removeAlpha()
    .png()
    .toBuffer();
}

/** The mark alone on transparency. */
async function markOnly(size, { body, eye, trim, fill }) {
  return sharp(Buffer.from(mark({ size, fill, inner: shapes({ body, eye, trim }) })))
    .png()
    .toBuffer();
}

/** Rounds a square tile to iOS-ish corners, for use inside the app's own UI. */
async function rounded(buffer, size, radius) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  return sharp(buffer)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function write(buffer, ...parts) {
  const out = join(assets, ...parts);
  await mkdir(dirname(out), { recursive: true });
  await sharp(buffer).toFile(out);
  console.log(`wrote assets/${parts.join("/")}`);
}

// --- iOS ------------------------------------------------------------------
// The universal/light icon, plus the dark and tinted variants iOS 18 asks for.
// All three are the same mark at the same size so the app stays recognisable
// however the home screen is themed.
await write(await tile(1024), "icon.png");
await write(await tile(1024, { from: "#1d2420", to: INK }), "icon-dark.png");
// Tinted icons are graded by the system from the image's luminance, so this one
// is grayscale end to end.
await write(
  await tile(1024, { from: "#3a3a3a", to: "#101010", body: "#e8e8e8", eye: "#8f8f8f", trim: "#9a9a9a" }),
  "icon-tinted.png"
);

// --- Android --------------------------------------------------------------
// The launcher masks the outer ~25% of an adaptive icon, so the foreground runs
// smaller than the iOS tile to stay inside the safe zone.
const ANDROID_FILL = 0.55;
await write(
  await markOnly(1024, { body: CREAM, eye: CYAN, trim: GOLD, fill: ANDROID_FILL }),
  "android-icon-foreground.png"
);
await write(
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1000 1000">${gradient(1000, 1000, GREEN_LIGHT, GREEN_DARK)}</svg>`
    )
  )
    .png()
    .toBuffer(),
  "android-icon-background.png"
);
// Themed icons get re-coloured flat by the launcher, so a solid silhouette
// would lose the face entirely. Knock the eyes and mouth out instead.
const monoScale = (ANDROID_FILL * 1000) / ROBOT_W;
const monoX = (1000 - ANDROID_FILL * 1000) / 2 - ROBOT_X * monoScale;
const monoY = (1000 - ROBOT_H * monoScale) / 2;
await write(
  await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1000 1000">
      <mask id="m">
        <rect width="1000" height="1000" fill="#000"/>
        <g transform="translate(${monoX.toFixed(2)} ${monoY.toFixed(2)}) scale(${monoScale.toFixed(4)})">
          ${shapes({ body: "#fff", eye: "#000", trim: "#fff", mouth: "#000" })}
        </g>
      </mask>
      <rect width="1000" height="1000" fill="#fff" mask="url(#m)"/>
    </svg>`)
  )
    .png()
    .toBuffer(),
  "android-icon-monochrome.png"
);

// --- Splash and web -------------------------------------------------------
// The splash asset sits on a light ground, so the robot runs in green here.
await write(await markOnly(1024, { body: GREEN, eye: "#2aa9a2", trim: GOLD, fill: 0.6 }), "splash-icon.png");
await write(await tile(48), "favicon.png");

// --- In-app header --------------------------------------------------------
// A miniature of the home-screen icon, so the app's own chrome matches what the
// user tapped. 256px covers @3x at the ~44pt it renders at.
await write(await rounded(await tile(256), 256, 58), "logo-emblem.png");

// --- Store listings -------------------------------------------------------
// Not bundled into the app; uploaded in App Store Connect / the Play Console.
await write(await tile(512), "play-store", "icon-512.png");

const featureIcon = await rounded(await tile(300), 300, 68);
await write(
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">${gradient(1024, 500, GREEN_LIGHT, GREEN_DARK)}</svg>`
    )
  )
    .composite([
      { input: featureIcon, left: 96, top: 100 },
      {
        input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300">
  <text x="0" y="118" font-family="DejaVu Serif, Liberation Serif, serif" font-size="62" font-weight="bold" fill="${CREAM}">AI Safety</text>
  <text x="0" y="192" font-family="DejaVu Serif, Liberation Serif, serif" font-size="62" font-weight="bold" fill="${CREAM}">Resources</text>
  <text x="4" y="248" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-size="26" fill="${GOLD}">Read, watch, and track the canon</text>
</svg>`),
        left: 452,
        top: 100,
      },
    ])
    .flatten({ background: GREEN })
    .removeAlpha()
    .png()
    .toBuffer(),
  "play-store",
  "feature-graphic.png"
);
