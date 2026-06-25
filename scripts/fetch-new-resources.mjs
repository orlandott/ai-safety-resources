#!/usr/bin/env node

// Weekly resource discovery.
//
// Fetches recently published AI-safety / alignment papers from the public
// arXiv API (no API key required), filters out anything already present in
// `public/resources.js`, and inserts the most relevant new entries into the
// Academic Papers section so they match the existing curated format.
//
// Usage:
//   node scripts/fetch-new-resources.mjs            # add up to --max new papers
//   node scripts/fetch-new-resources.mjs --dry-run  # print candidates, write nothing
//   node scripts/fetch-new-resources.mjs --max 3    # cap how many are added
//
// Designed to be run on a weekly cron (see
// .github/workflows/weekly-new-resources.yml), which opens a pull request with
// whatever it finds so a human can review before it goes live.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const resourcesPath = path.join(workspaceRoot, "public", "resources.js");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const maxFlagIndex = args.indexOf("--max");
const MAX_NEW =
  maxFlagIndex !== -1 && args[maxFlagIndex + 1]
    ? Math.max(1, Number.parseInt(args[maxFlagIndex + 1], 10) || 5)
    : 5;

// How many results to pull from each query before filtering/deduping.
const RESULTS_PER_QUERY = 40;

// Each query targets a facet of the AI-safety literature. arXiv ranks by most
// recent submission, so this surfaces fresh work every week.
const QUERIES = [
  'all:"AI safety"',
  'all:"AI alignment"',
  'all:"alignment" AND cat:cs.AI',
  'all:"interpretability" AND cat:cs.LG',
  'all:"reward hacking"',
  'all:"scalable oversight"',
  'all:"deceptive alignment"',
  'all:"jailbreak" AND cat:cs.CL',
  'all:"AI governance"',
  'all:"existential risk" AND cat:cs.AI',
];

// Terms that must appear in a candidate's title or abstract for it to count as
// genuinely safety-relevant (arXiv's relevance is broad, so we tighten it).
const RELEVANCE_TERMS = [
  "safety",
  "alignment",
  "aligned",
  "interpretab",
  "misalign",
  "reward hack",
  "oversight",
  "decepti",
  "jailbreak",
  "red team",
  "red-team",
  "existential risk",
  "catastrophic",
  "governance",
  "robustness",
  "guardrail",
  "harmless",
  "sycophan",
  "honest",
  "evaluation of large language",
  "frontier model",
  "dangerous capabilit",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeTitle = (title = "") =>
  title
    .toString()
    .normalize("NFKD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll(/&/g, " and ")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();

// Pull the bare arXiv id (e.g. 2401.05566) out of any arxiv.org URL.
const arxivIdFromUrl = (url = "") => {
  const match = url
    .toString()
    .match(/arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5})/i);
  return match ? match[1] : "";
};

// Load the existing `resources` array by evaluating resources.js in a sandbox.
const readExistingResources = () => {
  const source = fs.readFileSync(resourcesPath, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `${source}\nglobalThis.__RESOURCES__ = typeof resources !== "undefined" ? resources : [];`,
    sandbox
  );
  return Array.isArray(sandbox.__RESOURCES__) ? sandbox.__RESOURCES__ : [];
};

// Minimal Atom parser for the arXiv API response (avoids adding a dependency).
const parseArxivFeed = (xml) => {
  const entries = [];
  const entryBlocks = xml.split("<entry>").slice(1);
  for (const block of entryBlocks) {
    const body = block.split("</entry>")[0];
    const pick = (tag) => {
      const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeEntities(m[1].replace(/\s+/g, " ").trim()) : "";
    };
    const idRaw = pick("id");
    const authors = [];
    const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(body)) !== null) {
      authors.push(decodeEntities(authorMatch[1].replace(/\s+/g, " ").trim()));
    }
    entries.push({
      title: pick("title"),
      summary: pick("summary"),
      published: pick("published"),
      id: idRaw,
      arxivId: arxivIdFromUrl(idRaw),
      authors,
    });
  }
  return entries;
};

const decodeEntities = (text = "") =>
  text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");

const fetchQuery = async (query) => {
  const url =
    "http://export.arxiv.org/api/query?" +
    new URLSearchParams({
      search_query: query,
      start: "0",
      max_results: String(RESULTS_PER_QUERY),
      sortBy: "submittedDate",
      sortOrder: "descending",
    }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ai-safety-resources-bot/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`Query failed (${response.status}): ${query}`);
      return [];
    }
    return parseArxivFeed(await response.text());
  } catch (error) {
    console.warn(`Query error for "${query}": ${error?.name || error}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

const isRelevant = (entry) => {
  const haystack = `${entry.title} ${entry.summary}`.toLowerCase();
  return RELEVANCE_TERMS.some((term) => haystack.includes(term));
};

const formatAuthors = (authors = []) => {
  if (!authors.length) return "arXiv";
  if (authors.length <= 2) return authors.join(", ");
  return `${authors[0]} et al.`;
};

// First sentence(s) of the abstract, trimmed to a reasonable length so the
// card stays scannable like the hand-written summaries.
const buildSummary = (abstract = "") => {
  const clean = abstract.replace(/\s+/g, " ").trim();
  if (!clean) return "Recent arXiv preprint on AI safety and alignment.";
  const limit = 320;
  if (clean.length <= limit) return clean;
  const slice = clean.slice(0, limit);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "));
  const cut = lastStop > 120 ? lastStop + 1 : slice.lastIndexOf(" ");
  return `${slice.slice(0, cut).trim()}…`;
};

// Escape a value for embedding inside a double-quoted JS string literal.
const jsString = (value = "") =>
  `"${value.toString().replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const formatEntry = (entry) => {
  const year = Number.parseInt((entry.published || "").slice(0, 4), 10);
  const fields = [
    `Name: ${jsString(entry.title)}`,
    `Author: ${jsString(formatAuthors(entry.authors))}`,
    `Link: ${jsString(`https://arxiv.org/abs/${entry.arxivId}`)}`,
    `Category: "academic_papers"`,
    `Year: ${Number.isFinite(year) ? year : new Date(entry.published).getFullYear()}`,
    `Summary: ${jsString(buildSummary(entry.summary))}`,
  ];
  return `  { ${fields.join(", ")} },`;
};

const insertEntries = (source, entryLines) => {
  // Append to the end of the Academic Papers section, which sits just before
  // the Non-Fiction Books header.
  const marker = "  // ── Non-Fiction Books";
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Could not locate Academic Papers section boundary.");
  }
  const block = `${entryLines.join("\n")}\n\n`;
  return source.slice(0, markerIndex) + block + source.slice(markerIndex);
};

export {
  normalizeTitle,
  arxivIdFromUrl,
  parseArxivFeed,
  isRelevant,
  buildSummary,
  formatEntry,
  insertEntries,
};

const main = async () => {
  if (!fs.existsSync(resourcesPath)) {
    console.error(`resources.js not found at ${resourcesPath}`);
    process.exit(1);
  }

  const existing = readExistingResources();
  const existingTitles = new Set(existing.map((r) => normalizeTitle(r.Name)));
  const existingArxivIds = new Set(
    existing.map((r) => arxivIdFromUrl(r.Link)).filter(Boolean)
  );

  console.log(
    `Loaded ${existing.length} existing resources ` +
      `(${existingArxivIds.size} arXiv-linked). Querying arXiv…`
  );

  const seen = new Set();
  const candidates = [];
  for (const query of QUERIES) {
    const entries = await fetchQuery(query);
    for (const entry of entries) {
      if (!entry.arxivId || !entry.title) continue;
      if (seen.has(entry.arxivId)) continue;
      seen.add(entry.arxivId);

      if (existingArxivIds.has(entry.arxivId)) continue;
      if (existingTitles.has(normalizeTitle(entry.title))) continue;
      if (!isRelevant(entry)) continue;

      candidates.push(entry);
    }
    await sleep(1200); // be polite to the arXiv API
  }

  // Most recent first, then cap.
  candidates.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
  const selected = candidates.slice(0, MAX_NEW);

  console.log(
    `\nFound ${candidates.length} new relevant papers; adding ${selected.length}.`
  );
  for (const entry of selected) {
    console.log(`- [${entry.published.slice(0, 10)}] ${entry.title}`);
  }

  if (!selected.length) {
    console.log("\nNothing new to add this week.");
    return;
  }

  const entryLines = selected.map(formatEntry);

  if (isDryRun) {
    console.log("\n--dry-run: would insert:\n");
    console.log(entryLines.join("\n"));
    return;
  }

  const source = fs.readFileSync(resourcesPath, "utf8");
  const updated = insertEntries(source, entryLines);
  fs.writeFileSync(resourcesPath, updated, "utf8");
  console.log(
    `\nAdded ${selected.length} resource(s) to ${path.relative(workspaceRoot, resourcesPath)}.`
  );
};

// Only run the network/file workflow when invoked directly, so the helpers
// above can be imported and unit-tested without making API calls.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("fetch-new-resources failed:", error);
    process.exit(1);
  });
}
