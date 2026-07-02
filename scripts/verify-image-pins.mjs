#!/usr/bin/env node
//
// Verify every image pin in the dataset against its source of truth, so a
// typo'd or drifted pin can never ship a wrong image:
//
//   - `Wikipedia` pins        -> the article must exist (report its lead image)
//   - `OpenLibraryWork` pins  -> the work/edition must exist, and its title
//                                must resemble the entry's title
//   - `YouTubeVideoId` pins   -> the video must exist (oEmbed), and its channel
//                                is reported for eyeballing against the entry
//   - inline `Image` URLs     -> must return an image content-type
//   - hard-coded image URLs in public/script.js (seeded covers, author
//     portraits, org logos) -> must still serve images
//
// Run from the repo root wherever outbound network access is available:
//   node scripts/verify-image-pins.mjs
//
// Exits non-zero on hard failures (missing article/record/video, dead image
// URL). Two things are deliberately warnings, not failures: "pin resolves but
// has no image" (the runtime degrades to the letter placeholder, which is the
// intended behavior) and "source rate-limited/bot-blocked us" (403/429 says
// nothing about the pin itself — resource-guardrails.mjs treats those the
// same way).

import fs from "node:fs";
import { loadResources, scriptPath } from "./lib/resources.mjs";

const CONCURRENCY = 6;
const TIMEOUT_MS = 15000;
const RETRIES = 2;
const BOT_BLOCK_STATUSES = new Set([403, 429]);

const failures = [];
const warnings = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch a URL and read its body within one timeout window (clearing the timer
// after headers would let a stalled body hang the run), retrying transient
// statuses. Returns { status, contentType, body } where body is a Buffer for
// "buffer" mode and parsed JSON for "json" mode; a bot-block status returns
// with body null instead of throwing so callers can downgrade to a warning.
const request = async (url, { as = "json", headers = {} } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "ai-safety-resources image-pin verifier (github.com/orlandott/ai-safety-resources)",
          ...headers,
        },
        signal: controller.signal,
      });
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const contentLength = res.headers.get("content-length");
      if (res.status >= 500 && attempt < RETRIES) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (BOT_BLOCK_STATUSES.has(res.status)) {
        if (attempt < RETRIES) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        return { status: res.status, contentType, contentLength, body: null, botBlocked: true };
      }
      if (!res.ok) {
        return { status: res.status, contentType, contentLength, body: null };
      }
      // For images the headers usually answer everything — skip the download
      // when the origin declares a size.
      if (as === "buffer" && contentLength !== null) {
        await res.body?.cancel();
        return { status: res.status, contentType, contentLength, body: Buffer.alloc(0) };
      }
      const body = as === "json" ? await res.json() : Buffer.from(await res.arrayBuffer());
      return { status: res.status, contentType, contentLength, body };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
};

// Mirrors normalizeCatalogTitle in public/script.js (browser file, cannot
// import) — keep the two in sync.
const normalizeTitle = (value = "") =>
  value
    .toString()
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/&/g, " and ")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");

const titlesResemble = (left, right) => {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `) || a.includes(b) || b.includes(a);
};

const noteBotBlock = (name, what) => {
  warnings.push(`${name}: ${what} rate-limited/blocked the verifier (403/429) — unverifiable this run, not a pin failure`);
};

const checkWikipediaPin = async (entry) => {
  const article = entry.Wikipedia.trim();
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
    "&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=500" +
    `&titles=${encodeURIComponent(article)}`;
  const res = await request(url, { headers: { Accept: "application/json" } });
  if (res.botBlocked) return noteBotBlock(entry.Name, "Wikipedia");
  if (!res.body) throw new Error(`Wikipedia API HTTP ${res.status}`);
  const pages = Object.values(res.body?.query?.pages || {});
  // The API pipe-splits titles and marks unparsable ones `invalid` (without
  // `missing`), so anything other than exactly one existing page is a broken pin.
  const validPages = pages.filter((p) => p.missing === undefined && p.invalid === undefined);
  if (pages.some((p) => p.invalid !== undefined) || pages.length !== 1 || !validPages.length) {
    failures.push(`${entry.Name}: Wikipedia article not found or title invalid: "${article}"`);
    return;
  }
  if (!validPages[0]?.thumbnail?.source) {
    warnings.push(`${entry.Name}: Wikipedia article "${article}" has no lead image (card falls back to placeholder)`);
  }
};

const checkOpenLibraryPin = async (entry) => {
  const id = entry.OpenLibraryWork.trim();
  const isWork = /W$/.test(id);
  const url = `https://openlibrary.org/${isWork ? "works" : "books"}/${id}.json`;
  const res = await request(url, { headers: { Accept: "application/json" } });
  if (res.botBlocked) return noteBotBlock(entry.Name, "Open Library");
  if (res.status === 404) {
    failures.push(`${entry.Name}: Open Library record not found: ${id}`);
    return;
  }
  if (!res.body) throw new Error(`Open Library HTTP ${res.status}`);
  const recordTitle = res.body?.title || "";
  if (recordTitle && !titlesResemble(recordTitle, entry.Name)) {
    // Renames and subtitles are legitimate, so a mismatch is a loud warning to
    // eyeball, not an automatic failure.
    warnings.push(`${entry.Name}: Open Library ${id} is titled "${recordTitle}" — confirm it is the same book`);
  }
  const covers = Array.isArray(res.body?.covers) ? res.body.covers.filter((c) => Number(c) > 0) : [];
  if (!covers.length) {
    warnings.push(`${entry.Name}: Open Library ${id} has no cover (card falls back to placeholder)`);
  }
};

const checkYouTubePin = async (entry) => {
  const id = entry.YouTubeVideoId.trim();
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  const res = await request(url, { headers: { Accept: "application/json" } });
  // oEmbed 403 means "embedding disabled for this video" — the runtime's
  // inline player would not work — so unlike other sources it is a real
  // failure here, not a bot block. Only 429 stays unverifiable.
  if (res.botBlocked && res.status === 429) return noteBotBlock(entry.Name, "YouTube oEmbed");
  if ([400, 401, 403, 404].includes(res.status)) {
    failures.push(`${entry.Name}: YouTube video ${id} is missing or not embeddable (oEmbed HTTP ${res.status})`);
    return;
  }
  if (!res.body) throw new Error(`YouTube oEmbed HTTP ${res.status}`);
  console.log(`    ${entry.Name}: video ${id} = "${res.body.title}" by "${res.body.author_name}"`);
};

const checkImageUrl = async (name, imageUrl) => {
  let url = imageUrl.trim();
  // Open Library serves a 1x1 placeholder for missing covers unless asked not to.
  if (/covers\.openlibrary\.org/.test(url) && !url.includes("default=")) {
    url += (url.includes("?") ? "&" : "?") + "default=false";
  }
  const res = await request(url, { as: "buffer" });
  if (res.botBlocked) return noteBotBlock(name, "image host");
  if (!res.body) {
    failures.push(`${name}: Image URL returned HTTP ${res.status}: ${imageUrl}`);
    return;
  }
  if (!res.contentType.startsWith("image/")) {
    failures.push(`${name}: Image URL is not an image (content-type ${res.contentType || "unknown"}): ${imageUrl}`);
    return;
  }
  const byteSize = res.contentLength !== null ? Number(res.contentLength) : res.body.byteLength;
  if (!res.contentType.includes("svg") && Number.isFinite(byteSize) && byteSize < 1024) {
    warnings.push(`${name}: Image is suspiciously small (${byteSize} bytes, possible placeholder): ${imageUrl}`);
  }
};

// The runtime also ships hard-coded image URLs in script.js (seeded book
// covers, verified author portraits, org logos). Their identity was curated by
// hand; here we at least catch the ones that stop serving an image. Throws
// when a block cannot be located so formatting drift fails loudly instead of
// silently verifying nothing (same contract as loadFictionTitles).
const collectScriptImageUrls = () => {
  const source = fs.readFileSync(scriptPath, "utf8");
  const urls = new Map(); // url -> label
  const sections = [
    ["seededEntryMetadata", /const seededEntryMetadata = \{([\s\S]*?)\n {2}\};/],
    ["verifiedAuthorPortraits", /const verifiedAuthorPortraits = \{([\s\S]*?)\n {2}\};/],
    ["preferredOrganizationLogos", /const preferredOrganizationLogos = \{([\s\S]*?)\n {2}\};/],
  ];
  for (const [label, re] of sections) {
    const block = source.match(re);
    if (!block) {
      throw new Error(`Could not locate ${label} in public/script.js — update collectScriptImageUrls`);
    }
    let found = 0;
    for (const m of block[1].matchAll(/"(https:\/\/[^"]+)"/g)) {
      urls.set(m[1], label);
      found += 1;
    }
    if (!found) {
      throw new Error(`Found no image URLs inside ${label} in public/script.js — update collectScriptImageUrls`);
    }
  }
  return urls;
};

async function main() {
  const resources = loadResources();
  const checks = [];
  const seen = new Set();
  const addCheck = (dedupeKey, name, run) => {
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    checks.push({ name, run });
  };

  for (const [url, label] of collectScriptImageUrls()) {
    addCheck(`image|${url}`, `script.js ${label}`, () => checkImageUrl(`script.js ${label}`, url));
  }
  for (const entry of resources) {
    if (typeof entry.Wikipedia === "string" && entry.Wikipedia.trim()) {
      addCheck(`wikipedia|${entry.Wikipedia.trim()}`, entry.Name, () => checkWikipediaPin(entry));
    }
    if (typeof entry.OpenLibraryWork === "string" && entry.OpenLibraryWork.trim()) {
      addCheck(`openlibrary|${entry.OpenLibraryWork.trim()}`, entry.Name, () => checkOpenLibraryPin(entry));
    }
    if (typeof entry.YouTubeVideoId === "string" && entry.YouTubeVideoId.trim()) {
      addCheck(`youtube|${entry.YouTubeVideoId.trim()}`, entry.Name, () => checkYouTubePin(entry));
    }
    if (typeof entry.Image === "string" && entry.Image.trim()) {
      addCheck(`image|${entry.Image.trim()}`, entry.Name, () => checkImageUrl(entry.Name, entry.Image));
    }
  }

  console.log(`Verifying ${checks.length} image pin(s) across ${resources.length} resources...`);
  let index = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (index < checks.length) {
      const check = checks[index++];
      try {
        await check.run();
      } catch (error) {
        failures.push(`${check.name}: check errored: ${error.message}`);
      }
    }
  });
  await Promise.all(workers);

  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  if (failures.length) {
    console.error(`\n✗ ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\n✓ All pins verified (${warnings.length} warning(s)).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
