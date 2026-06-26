// Shared loader + metadata for the resource dataset.
//
// `public/resources.js` remains the canonical, human-edited source of truth.
// This module parses it (the same way the runtime and the guardrails checker
// do) and exposes the derived structures the build pipeline needs, so there is
// exactly one place that defines categories and the books -> fiction/non-fiction
// split.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = path.resolve(__dirname, "..", "..");
export const resourcesPath = path.join(workspaceRoot, "public", "resources.js");
export const scriptPath = path.join(workspaceRoot, "public", "script.js");

export const SITE_ORIGIN = "https://ai-safety-resources.com";

// Display "tracks" in the same order as the tabs in index.html. `pane` matches
// the container id the runtime renders into; `intro` mirrors the on-page copy.
export const TRACKS = [
  {
    key: "non_fiction_books",
    slug: "non-fiction-books",
    label: "Non-fiction Books",
    pane: "books-non-fiction-parent",
    intro:
      "Non-fiction books on AI safety, alignment, and related topics—from primers to foundational texts.",
  },
  {
    key: "fiction_books",
    slug: "fiction-books",
    label: "Fiction Books",
    pane: "books-fiction-parent",
    intro:
      "Speculative and science fiction that explores AI, agency, and long-term futures through story.",
  },
  {
    key: "academic_papers",
    slug: "academic-papers",
    label: "Academic Papers",
    pane: "academic-papers-parent",
    intro:
      "Research papers, preprints, and technical reports on alignment, interpretability, and safety.",
  },
  {
    key: "films",
    slug: "films",
    label: "Films",
    pane: "films-parent",
    intro: "Films that explore AI, agency, and the future of intelligence.",
  },
  {
    key: "tv",
    slug: "tv",
    label: "TV Shows",
    pane: "tv-parent",
    intro:
      "Television series that dramatize machine intelligence, agency, and the alignment problem.",
  },
  {
    key: "documentaries",
    slug: "documentaries",
    label: "Documentaries",
    pane: "documentaries-parent",
    intro:
      "Documentary films that examine artificial intelligence, its risks, and the people working on AI safety and alignment.",
  },
  {
    key: "podcasts",
    slug: "podcasts",
    label: "Podcasts",
    pane: "podcasts-parent",
    intro: "Podcast episodes and series on AI safety and alignment.",
  },
  {
    key: "websites",
    slug: "websites",
    label: "Websites",
    pane: "websites-parent",
    intro:
      "Essays, blog posts, and online resources on AI safety and related ideas.",
  },
  {
    key: "youtube",
    slug: "youtube",
    label: "YouTube",
    pane: "youtube-parent",
    intro:
      "Video explainers and talks on AI safety and alignment—whole channels devoted to the topic, plus standout individual videos.",
  },
];

export const TRACK_BY_KEY = new Map(TRACKS.map((t) => [t.key, t]));

// Raw `Category` values allowed in resources.js. "books" is later split into
// fiction/non-fiction tracks via the title list below.
export const VALID_CATEGORIES = new Set([
  "academic_papers",
  "books",
  "films",
  "tv",
  "documentaries",
  "podcasts",
  "websites",
  "youtube",
]);

// Evaluate resources.js in a sandbox and return the `resources` array.
export function loadResources() {
  const source = fs.readFileSync(resourcesPath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  const arr = vm.runInContext(`${source}\nresources;`, sandbox, {
    filename: "resources.js",
  });
  if (!Array.isArray(arr)) {
    throw new Error("resources.js did not evaluate to an array");
  }
  return arr.filter((entry) => entry && typeof entry === "object");
}

// Parse the canonical fiction-title list straight out of script.js so the
// build never drifts from the runtime classification.
export function loadFictionTitles() {
  const source = fs.readFileSync(scriptPath, "utf8");
  const match = source.match(
    /const fictionBookTitles = new Set\(\[([\s\S]*?)\]\);/
  );
  if (!match) {
    throw new Error("Could not locate fictionBookTitles in script.js");
  }
  const titles = new Set();
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(match[1])) !== null) {
    const raw = m[1] ?? m[2] ?? "";
    titles.add(raw.replace(/\\(.)/g, "$1"));
  }
  return titles;
}

// Resolve an entry to its display track key. Mirrors getEntryBucketKey() in
// script.js exactly.
export function bucketKey(entry, fictionTitles) {
  let key = (entry.Category || "").toString();
  if (key === "books") {
    key = fictionTitles.has(entry.Name) ? "fiction_books" : "non_fiction_books";
  }
  return TRACK_BY_KEY.has(key) ? key : "";
}

// ── Topic tags ───────────────────────────────────────────────────────────
// Tags are derived (not hand-maintained per entry) from keyword matches against
// each resource's title + author + summary, plus its track. They are used to
// augment search text and to power the topic chips, so a resource tagged
// "governance" is found by the governance chip even if that exact word never
// appears in its summary. `label` is the chip text; `keywords` are matched
// case-insensitively as substrings.
export const TOPIC_TAGS = [
  { tag: "interpretability", label: "Interpretability", keywords: ["interpretab", "mechanistic", "circuits", "superposition", "latent knowledge", "probing", "feature visualization"] },
  { tag: "alignment", label: "Alignment", keywords: ["alignment", "aligned", "rlhf", "constitutional ai", "human feedback", "preference", "scalable oversight", "reward model"] },
  { tag: "governance", label: "Governance & policy", keywords: ["governance", "policy", "regulation", "windfall", "international", "treaty", "compute govern", "standards", "law"] },
  { tag: "existential-risk", label: "Existential risk", keywords: ["existential", "x-risk", "extinction", "catastroph", "doom", "takeover", "power-seeking", "vulnerable world", "superintelligence"] },
  { tag: "deception", label: "Deception & scheming", keywords: ["decepti", "sleeper", "mesa-optim", "mesa optim", "scheming", "treacherous", "deceptive alignment", "learned optimization"] },
  { tag: "rl", label: "Reinforcement learning", keywords: ["reinforcement", "ppo", "policy gradient", "reward hacking", "imitation learning", "specification gaming"] },
  { tag: "forecasting", label: "Forecasting & timelines", keywords: ["forecast", "timelines", "scaling law", "takeoff", "emergent abilities", "compute-optimal", "ai impacts"] },
  { tag: "ethics", label: "Ethics & society", keywords: ["ethic", "welfare", "moral", "fairness", "bias", "rights", "society", "discrimination"] },
  { tag: "llms", label: "Language models", keywords: ["language model", " gpt", "llm", "transformer", "chatbot", "chain-of-thought", "few-shot", "instruct"] },
  { tag: "fiction", label: "Fiction & story", keywords: [] }, // assigned by track below
];

export function tagsFor(entry, track) {
  const haystack = `${entry.Name || ""} ${entry.Author || ""} ${entry.Summary || ""}`.toLowerCase();
  const tags = [];
  for (const t of TOPIC_TAGS) {
    if (t.tag === "fiction") {
      if (track === "fiction_books") tags.push(t.tag);
      continue;
    }
    if (t.keywords.some((kw) => haystack.includes(kw))) tags.push(t.tag);
  }
  return tags;
}

// ── "Start here" on-ramp ─────────────────────────────────────────────────
// A short, hand-picked path for newcomers. Each entry references an existing
// resource by its exact Name; the build resolves and validates these against
// the dataset so a typo fails the build rather than silently dropping a card.
export const STARTERS = [
  { name: "Human Compatible", why: "The clearest book-length case for why control of advanced AI is hard—and a proposed fix." },
  { name: "Concrete problems in AI safety", why: "The paper that turned 'AI safety' into a concrete engineering agenda." },
  { name: "Ex Machina", why: "A tense, human-scale story about testing whether a machine is really aligned." },
  { name: "AlphaGo", track: "documentaries", why: "A documentary on the match that made superhuman AI feel suddenly real." },
  { name: "I, Robot", track: "fiction_books", why: "Asimov's robot stories are the original alignment case studies—safety rules that break down under edge cases and literal interpretation." },
  { name: "Black Mirror", track: "tv", why: "An anthology that turns abstract AI risks—reward hacking, runaway optimization, digital minds—into visceral near-future stories." },
  { name: "80,000 Hours Podcast", track: "podcasts", why: "Long-form interviews that map the AI risk landscape—alignment, governance, and how to actually work on it." },
  { name: "Robert Miles AI Safety", track: "youtube", why: "The most popular alignment video series—clear, rigorous explainers of the core safety concepts." },
  { name: "LessWrong", why: "The community where many foundational alignment arguments were first worked out." },
];

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function isValidHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

// Group entries into tracks (in TRACKS order), preserving source order within
// each track. Returns Map<trackKey, entry[]>.
export function groupByTrack(resources, fictionTitles) {
  const groups = new Map(TRACKS.map((t) => [t.key, []]));
  for (const entry of resources) {
    const key = bucketKey(entry, fictionTitles);
    if (key) groups.get(key).push(entry);
  }
  return groups;
}
