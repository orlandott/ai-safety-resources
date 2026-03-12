#!/usr/bin/env node
/**
 * Fetch official film titles and poster URLs from OMDB and update public/resources.js.
 * Only updates films that are missing Image or when --all is passed.
 *
 * Requires: OMDB_API_KEY (free at https://www.omdbapi.com/apikey.aspx)
 * Run from repo root: OMDB_API_KEY=yourkey node scripts/fetch-film-posters-omdb.mjs [--all]
 */
import { readFileSync, writeFileSync } from "fs";

const RESOURCES_PATH = "public/resources.js";
const IMDB_LINK_RE = /Link:\s*["']https?:\/\/(?:www\.)?imdb\.com\/title\/(tt\d+)\/[^"']*["']/;
const IMAGE_RE = /Image:\s*["']([^"']*)["']/;
const NAME_RE = /Name:\s*["']([^"']*)["']/;
const REFRESH_ALL = process.argv.includes("--all");

async function fetchOmdb(imdbId, apiKey) {
  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&i=${imdbId}&r=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OMDB HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === "False") throw new Error(data.Error || "OMDB error");
  return {
    title: data.Title || "",
    year: data.Year || "",
    poster: data.Poster && data.Poster !== "N/A" ? data.Poster : "",
  };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeForJsString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function main() {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.error("Set OMDB_API_KEY (get a free key at https://www.omdbapi.com/apikey.aspx)");
    process.exit(1);
  }

  const raw = readFileSync(RESOURCES_PATH, "utf8");
  const lines = raw.split("\n");
  const updates = new Map(); // line index -> { poster, title }
  let missing = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('Category: "films"')) continue;
    const linkMatch = line.match(IMDB_LINK_RE);
    if (!linkMatch) continue;
    const imdbId = linkMatch[1];
    const hasImage = IMAGE_RE.test(line);
    if (hasImage && !REFRESH_ALL) continue;
    if (!hasImage) missing++;
    try {
      const data = await fetchOmdb(imdbId, apiKey);
      await delay(220);
      updates.set(i, data);
    } catch (err) {
      console.warn(`OMDB failed for ${imdbId}:`, err.message);
    }
  }

  let updated = 0;
  const out = lines.map((line, i) => {
    const data = updates.get(i);
    if (!data) return line;
    let newLine = line;
    if (data.poster) {
      if (IMAGE_RE.test(newLine)) {
        newLine = newLine.replace(IMAGE_RE, `Image: "${escapeForJsString(data.poster)}"`);
      } else {
        newLine = newLine.replace(
          /(page_count:\s*0,\s*)(Summary:)/,
          `$1Image: "${escapeForJsString(data.poster)}", $2`
        );
      }
      updated++;
    }
    const nameMatch = NAME_RE.exec(line);
    if (data.title && (!nameMatch || !nameMatch[1]?.trim())) {
      if (NAME_RE.test(newLine)) {
        newLine = newLine.replace(NAME_RE, `Name: "${escapeForJsString(data.title)}"`);
      }
    }
    return newLine;
  });

  writeFileSync(RESOURCES_PATH, out.join("\n"), "utf8");
  console.log(
    `Updated ${updated} film poster(s) in ${RESOURCES_PATH}${missing ? ` (${missing} had been missing)` : ""}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
