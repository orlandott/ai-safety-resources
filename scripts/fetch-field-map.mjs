#!/usr/bin/env node
//
// Auto-pull the "papers / year" metric for the field map.
//
// For each branch in data/field-map.json we ask the arXiv API how many papers
// match that branch's `arxiv` search terms in each calendar year, and write the
// counts back into the branch's `papers` series. This is a research-VOLUME
// proxy, not a headcount — broad terms over-count, so read it as relative
// effort. The `people` (FTE) series is hand-curated and is never touched here.
//
// arXiv asks for <= 1 request / 3s and a descriptive User-Agent. We honour both.
//
// Usage:
//   node scripts/fetch-field-map.mjs                 # current year only
//   node scripts/fetch-field-map.mjs --from 2018     # backfill from a year
//   node scripts/fetch-field-map.mjs --year 2024     # a single specific year
//   node scripts/fetch-field-map.mjs --dry-run       # print, don't write
//
// Run `node scripts/build.mjs` afterwards to regenerate the page (the CI / the
// GitHub Action below does this and commits the result).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "field-map.json");
const ARXIV_API = "http://export.arxiv.org/api/query";
const UA =
  "ai-safety-resources field-map bot (+https://ai-safety-resources.com; contact@ai-safety-resources.com)";
const THROTTLE_MS = 3500;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const DRY_RUN = process.argv.includes("--dry-run");

function targetYears() {
  const now = new Date().getUTCFullYear();
  const single = arg("--year");
  if (single) return [Number(single)];
  const from = arg("--from");
  if (from) {
    const ys = [];
    for (let y = Number(from); y <= now; y++) ys.push(y);
    return ys;
  }
  return [now];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pull the <opensearch:totalResults> count for a query restricted to one year.
async function countForYear(query, year) {
  const range = `submittedDate:[${year}01010000 TO ${year}12312359]`;
  const search = `(${query}) AND ${range}`;
  const url =
    `${ARXIV_API}?search_query=${encodeURIComponent(search)}` +
    `&start=0&max_results=0`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status} for ${year}`);
  const xml = await res.text();
  const m = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
  if (!m) throw new Error(`no totalResults in arXiv response for ${year}`);
  return Number(m[1]);
}

function upsert(series, year, value) {
  const i = series.findIndex((p) => p.year === year);
  if (i >= 0) series[i].value = value;
  else series.push({ year, value });
  series.sort((a, b) => a.year - b.year);
}

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const years = targetYears();
  console.log(`Fetching arXiv paper counts for years: ${years.join(", ")}`);

  let first = true;
  for (const bucket of data.buckets) {
    if (!bucket.arxiv) continue;
    if (!Array.isArray(bucket.papers)) bucket.papers = [];
    for (const year of years) {
      if (!first) await sleep(THROTTLE_MS);
      first = false;
      try {
        const n = await countForYear(bucket.arxiv, year);
        upsert(bucket.papers, year, n);
        console.log(`  ${bucket.slug} ${year}: ${n}`);
      } catch (err) {
        console.warn(`  ! ${bucket.slug} ${year}: ${err.message}`);
      }
    }
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: not writing.");
    return;
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
  console.log(`\n✓ Wrote ${path.relative(path.join(__dirname, ".."), DATA_PATH)}`);
  console.log("  Run `node scripts/build.mjs` to regenerate the page.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
