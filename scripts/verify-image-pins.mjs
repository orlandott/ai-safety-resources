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
//
// Run from the repo root wherever outbound network access is available:
//   node scripts/verify-image-pins.mjs
//
// Exits non-zero on hard failures (missing article/record/video, dead image
// URL). "Pin resolves but has no image" is reported as a warning only — the
// runtime degrades to the letter placeholder, which is the intended behavior.

import fs from "node:fs";
import { loadResources, scriptPath } from "./lib/resources.mjs";

const CONCURRENCY = 6;
const TIMEOUT_MS = 15000;

const failures = [];
const warnings = [];

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      ...options,
      headers: {
        "User-Agent": "ai-safety-resources image-pin verifier (github.com/orlandott/ai-safety-resources)",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

const normalizeTitle = (value = "") =>
  value
    .toString()
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/g, "")
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

const checkWikipediaPin = async (entry) => {
  const article = entry.Wikipedia.trim();
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
    "&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=500" +
    `&titles=${encodeURIComponent(article)}`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Wikipedia API HTTP ${res.status}`);
  const payload = await res.json();
  const pages = Object.values(payload?.query?.pages || {});
  if (!pages.length || pages.every((p) => p.missing !== undefined)) {
    failures.push(`${entry.Name}: Wikipedia article not found: "${article}"`);
    return;
  }
  const page = pages.find((p) => p.missing === undefined);
  if (!page?.thumbnail?.source) {
    warnings.push(`${entry.Name}: Wikipedia article "${article}" has no lead image (card falls back to placeholder)`);
  }
};

const checkOpenLibraryPin = async (entry) => {
  const id = entry.OpenLibraryWork.trim();
  const isWork = /W$/.test(id);
  const url = `https://openlibrary.org/${isWork ? "works" : "books"}/${id}.json`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (res.status === 404) {
    failures.push(`${entry.Name}: Open Library record not found: ${id}`);
    return;
  }
  if (!res.ok) throw new Error(`Open Library HTTP ${res.status}`);
  const payload = await res.json();
  const recordTitle = payload?.title || "";
  if (recordTitle && !titlesResemble(recordTitle, entry.Name)) {
    // Renames and subtitles are legitimate, so a mismatch is a loud warning to
    // eyeball, not an automatic failure.
    warnings.push(`${entry.Name}: Open Library ${id} is titled "${recordTitle}" — confirm it is the same book`);
  }
  const covers = Array.isArray(payload?.covers) ? payload.covers.filter((c) => Number(c) > 0) : [];
  if (!covers.length) {
    warnings.push(`${entry.Name}: Open Library ${id} has no cover (card falls back to placeholder)`);
  }
};

const checkYouTubePin = async (entry) => {
  const id = entry.YouTubeVideoId.trim();
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } });
  if (res.status === 404 || res.status === 400 || res.status === 401) {
    failures.push(`${entry.Name}: YouTube video ${id} is missing or not embeddable (oEmbed HTTP ${res.status})`);
    return;
  }
  if (!res.ok) throw new Error(`YouTube oEmbed HTTP ${res.status}`);
  const payload = await res.json();
  console.log(`    ${entry.Name}: video ${id} = "${payload.title}" by "${payload.author_name}"`);
};

const checkImageUrl = async (entry) => {
  let url = entry.Image.trim();
  // Open Library serves a 1x1 placeholder for missing covers unless asked not to.
  if (/covers\.openlibrary\.org/.test(url) && !url.includes("default=")) {
    url += (url.includes("?") ? "&" : "?") + "default=false";
  }
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    failures.push(`${entry.Name}: Image URL returned HTTP ${res.status}: ${entry.Image}`);
    return;
  }
  const type = (res.headers.get("content-type") || "").toLowerCase();
  const body = new Uint8Array(await res.arrayBuffer());
  if (!type.startsWith("image/")) {
    failures.push(`${entry.Name}: Image URL is not an image (content-type ${type || "unknown"}): ${entry.Image}`);
    return;
  }
  if (!type.includes("svg") && body.byteLength < 1024) {
    warnings.push(`${entry.Name}: Image is suspiciously small (${body.byteLength} bytes, possible placeholder): ${entry.Image}`);
  }
};

// The runtime also ships hard-coded image URLs in script.js (seeded book
// covers, verified author portraits, org logos). Their identity was curated by
// hand; here we at least catch the ones that stop serving an image.
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
    if (!block) continue;
    for (const m of block[1].matchAll(/"(https:\/\/[^"]+)"/g)) {
      urls.set(m[1], label);
    }
  }
  return urls;
};

async function main() {
  const resources = loadResources();
  const checks = [];
  for (const [url, label] of collectScriptImageUrls()) {
    checks.push({
      label: `script.js ${label}`,
      run: () => checkImageUrl({ Name: `script.js ${label}`, Image: url }),
      entry: { Name: `script.js ${label} (${url})` },
    });
  }
  for (const entry of resources) {
    if (typeof entry.Wikipedia === "string" && entry.Wikipedia.trim()) {
      checks.push({ label: `wikipedia ${entry.Wikipedia}`, run: () => checkWikipediaPin(entry), entry });
    }
    if (typeof entry.OpenLibraryWork === "string" && entry.OpenLibraryWork.trim()) {
      checks.push({ label: `openlibrary ${entry.OpenLibraryWork}`, run: () => checkOpenLibraryPin(entry), entry });
    }
    if (typeof entry.YouTubeVideoId === "string" && entry.YouTubeVideoId.trim()) {
      checks.push({ label: `youtube ${entry.YouTubeVideoId}`, run: () => checkYouTubePin(entry), entry });
    }
    if (typeof entry.Image === "string" && entry.Image.trim()) {
      checks.push({ label: `image ${entry.Image}`, run: () => checkImageUrl(entry), entry });
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
        failures.push(`${check.entry.Name}: ${check.label} check errored: ${error.message}`);
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
