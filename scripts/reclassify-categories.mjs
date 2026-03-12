#!/usr/bin/env node
/**
 * Reclassify resources in books.js into: books, academic_papers, films, podcasts, websites.
 * Run from repo root: node scripts/reclassify-categories.mjs
 */
import { readFileSync, writeFileSync } from "fs";

const path = "public/books.js";
const raw = readFileSync(path, "utf8");

function categoryFromLink(link) {
  if (!link || typeof link !== "string") return "websites";
  const l = link.toLowerCase();
  if (l.includes("goodreads.com") || l.includes("amazon.")) return "books";
  if (l.includes("arxiv.org") || l.includes(".pdf") || l.includes("intelligence.org/files") ||
      l.includes("storage.googleapis.com/deepmind") || l.includes("cdn.openai.com") ||
      l.includes("nickbostrom.com/papers") || (l.includes("web.archive") && l.includes(".pdf")) ||
      (l.includes("courses.cs.umbc.edu") && l.includes(".pdf")) || (l.includes("fhi.ox.ac.uk") && l.includes(".pdf")))
    return "academic_papers";
  if (l.includes("distill.pub") || l.includes("transformer-circuits.pub")) return "academic_papers";
  if (l.includes("youtube.com") || l.includes("vimeo.com") || l.includes("imdb.com")) return "films";
  if (l.includes("spotify.com") || l.includes("podcast") || l.includes("apple.com/podcast")) return "podcasts";
  return "websites";
}

const lineRe = /^(\s*\{[^}]*)(Category:\s*"[^"]*")([^}]*\},?)\s*$/;
const linkRe = /Link:\s*["']([^"']+)["']/;

const lines = raw.split("\n");
const out = lines.map((line) => {
  const linkMatch = line.match(linkRe);
  const catMatch = line.match(lineRe);
  if (!catMatch || !linkMatch) return line;
  const newCat = categoryFromLink(linkMatch[1]);
  return line.replace(/Category:\s*"[^"]*"/, `Category: "${newCat}"`);
});

writeFileSync(path, out.join("\n"), "utf8");
console.log("Reclassified public/books.js by link → books | academic_papers | films | podcasts | websites");
