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
    key: "courses",
    slug: "courses",
    label: "Courses",
    pane: "courses-parent",
    intro:
      "Free online courses and structured curricula for learning AI safety and alignment—from non-technical introductions to hands-on research engineering.",
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
  "courses",
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

// ── Resource metadata (difficulty + time to consume) ──────────────────────
// Two lightweight, mostly-derived signals that answer a newcomer's first two
// questions: "is this over my head?" and "can I get through it tonight?".
//
// Level is a per-track default that authors can override per entry with a
// `Level` field ("Beginner" | "Intermediate" | "Advanced"). The defaults
// encode the obvious on-ramp: stories and video are accessible, papers are the
// deep end. Override on the exceptions (a beginner-friendly survey paper, an
// advanced trade book) rather than hand-labeling all 300+ entries.
export const VALID_LEVELS = ["Beginner", "Intermediate", "Advanced"];

const LEVEL_BY_TRACK = {
  non_fiction_books: "Intermediate",
  fiction_books: "Beginner",
  academic_papers: "Advanced",
  courses: "Beginner",
  films: "Beginner",
  tv: "Beginner",
  documentaries: "Beginner",
  podcasts: "Beginner",
  websites: "Intermediate",
  youtube: "Beginner",
};

export function levelFor(entry, track) {
  if (typeof entry.Level === "string" && VALID_LEVELS.includes(entry.Level)) {
    return entry.Level;
  }
  return LEVEL_BY_TRACK[track] || "";
}

// A rough "time to consume" label. Books/papers derive from `page_count`
// (~1.8 min/page); audio-visual tracks derive from an optional `Minutes`
// (runtime / episode length). Returns "" when there is nothing to estimate, so
// callers can omit the pill rather than guess.
const READING_MINUTES_PER_PAGE = 1.8;

function humanizeMinutes(minutes, verb) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  if (minutes < 90) return `~${Math.round(minutes / 5) * 5 || 5} min ${verb}`;
  const hours = minutes / 60;
  const rounded = hours < 10 ? Math.round(hours * 2) / 2 : Math.round(hours);
  return `~${rounded} hr ${verb}`;
}

export function timeLabelFor(entry, track) {
  const pages = Number(entry.page_count);
  if (Number.isFinite(pages) && pages > 0) {
    return humanizeMinutes(pages * READING_MINUTES_PER_PAGE, "read");
  }
  const minutes = Number(entry.Minutes);
  if (Number.isFinite(minutes) && minutes > 0) {
    const verb =
      track === "podcasts" || track === "youtube" ? "listen" : "watch";
    return humanizeMinutes(minutes, verb);
  }
  return "";
}

// The full set of metadata pills for an entry, in display order. Shared by the
// server-rendered cards (build) and mirrored by the runtime cards (script.js)
// so badges don't flash and vanish on hydration.
export function metaPillsFor(entry, track) {
  const pills = [];
  const level = levelFor(entry, track);
  if (level) pills.push({ kind: "level", text: level });
  const time = timeLabelFor(entry, track);
  if (time) pills.push({ kind: "time", text: time });
  return pills;
}

// ── Topic landing pages (SEO) ─────────────────────────────────────────────
// Each topic compiles a crawlable page at /topics/<slug>/ listing every
// resource carrying the matching derived tag (see TOPIC_TAGS), across all
// formats. `tag` ties the page to both the tag map and the homepage topic chip
// (data-topic-query); `slug` is the intent-optimized URL; `seoTitle`/`h1`/
// `description` target real search queries instead of internal category names.
export const TOPIC_PAGES = [
  {
    tag: "interpretability",
    slug: "mechanistic-interpretability",
    seoTitle: "Best Mechanistic Interpretability Resources",
    h1: "Mechanistic interpretability",
    description:
      "The best papers, talks, and explainers on mechanistic interpretability—reverse-engineering what neural networks actually compute.",
  },
  {
    tag: "alignment",
    slug: "ai-alignment",
    seoTitle: "Best AI Alignment Resources",
    h1: "AI alignment",
    description:
      "Foundational and current work on aligning AI systems with human intent—RLHF, scalable oversight, constitutional AI, and more.",
  },
  {
    tag: "governance",
    slug: "ai-governance-and-policy",
    seoTitle: "Best AI Governance & Policy Resources",
    h1: "AI governance & policy",
    description:
      "Reading on AI governance, regulation, and policy: compute governance, international coordination, standards, and law.",
  },
  {
    tag: "existential-risk",
    slug: "ai-existential-risk",
    seoTitle: "Best Resources on AI Existential Risk",
    h1: "AI existential risk",
    description:
      "The case for and against catastrophic risk from advanced AI—power-seeking, takeover, and superintelligence—across books, papers, and film.",
  },
  {
    tag: "deception",
    slug: "deceptive-alignment-and-scheming",
    seoTitle: "Best Resources on Deceptive Alignment & Scheming",
    h1: "Deceptive alignment & scheming",
    description:
      "Work on deception, sleeper agents, mesa-optimization, and treacherous turns—how models can learn to hide their true objectives.",
  },
  {
    tag: "rl",
    slug: "reinforcement-learning-and-reward-hacking",
    seoTitle: "Best Resources on Reinforcement Learning & Reward Hacking",
    h1: "Reinforcement learning & reward hacking",
    description:
      "Reinforcement learning as it bears on safety: reward hacking, specification gaming, imitation learning, and policy optimization.",
  },
  {
    tag: "forecasting",
    slug: "ai-forecasting-and-timelines",
    seoTitle: "Best Resources on AI Forecasting & Timelines",
    h1: "AI forecasting & timelines",
    description:
      "Scaling laws, takeoff dynamics, emergent abilities, and timeline forecasting for transformative AI.",
  },
  {
    tag: "ethics",
    slug: "ai-ethics-and-society",
    seoTitle: "Best Resources on AI Ethics & Society",
    h1: "AI ethics & society",
    description:
      "AI ethics, fairness, bias, model welfare, rights, and the broader social impact of advanced AI systems.",
  },
  {
    tag: "llms",
    slug: "large-language-models",
    seoTitle: "Best Resources on Large Language Models & Safety",
    h1: "Large language models",
    description:
      "Key papers and explainers on large language models—how they work, what they can do, and why that matters for safety.",
  },
  {
    tag: "fiction",
    slug: "ai-in-fiction",
    seoTitle: "Best AI Fiction: Novels & Stories About Machine Minds",
    h1: "AI in fiction",
    description:
      "Speculative and science fiction that explores AI, agency, and long-term futures through story.",
  },
];

// ── Learning paths ("Where do I start?") ──────────────────────────────────
// Audience-shaped, ordered on-ramps. Each step references an existing resource
// by its exact Name (and `track` to disambiguate cross-listed titles); the
// build resolves and validates them against the dataset so a typo fails the
// build rather than silently dropping a step. Rendered as a homepage chooser
// plus a crawlable page per path at /paths/<slug>/.
export const PATHS = [
  {
    slug: "new-to-ai-safety",
    audience: "I'm completely new",
    title: "New to AI safety",
    blurb: "No background needed—start with the big ideas through story and plain-language explainers.",
    description:
      "A gentle, no-prerequisites introduction to AI safety: why people worry, what the core problem is, and where the field is going—through an accessible book, a film, a documentary, and clear video explainers.",
    steps: [
      { name: "Human Compatible", why: "The clearest book-length case for why controlling advanced AI is hard—and a proposed fix." },
      { name: "Ex Machina", track: "films", why: "A tense, human-scale story about testing whether a machine is really aligned." },
      { name: "AlphaGo", track: "documentaries", why: "Watch the match that made superhuman AI feel suddenly, concretely real." },
      { name: "Robert Miles AI Safety", track: "youtube", why: "Clear, rigorous video explainers of the core safety concepts, one at a time." },
      { name: "Concrete problems in AI safety", track: "academic_papers", why: "Your first paper: the agenda that made 'AI safety' a concrete engineering problem." },
    ],
  },
  {
    slug: "ml-to-safety",
    audience: "I know ML, not safety",
    title: "From ML to AI safety",
    blurb: "You can train a model—now see where alignment fits and what the open problems are.",
    description:
      "For practitioners who know machine learning but haven't engaged with safety. Bridges from familiar training techniques to the alignment failure modes and research agendas that motivate the field.",
    steps: [
      { name: "Concrete problems in AI safety", track: "academic_papers", why: "The five-failure-mode framing that grounds safety as ML research." },
      { name: "Deep Reinforcement Learning from Human Preferences", track: "academic_papers", why: "The preference-learning method RLHF is built on." },
      { name: "Risks from Learned Optimization", track: "academic_papers", why: "Mesa-optimization and deceptive alignment, the core inner-alignment worry." },
      { name: "Goal Misgeneralization", track: "academic_papers", why: "How a capable model can pursue the wrong goal even with a correct training signal." },
      { name: "Constitutional AI: Harmlessness from AI Feedback", track: "academic_papers", why: "A current, deployed approach to scalable oversight." },
    ],
  },
  {
    slug: "engineers",
    audience: "I'm an engineer",
    title: "AI safety for engineers",
    blurb: "Hands-on, technical reading on interpretability, evals, and red teaming.",
    description:
      "A technical reading list for engineers who want to work on or near alignment: interpretability, adversarial robustness, red teaming, and the methods behind today's safety pipelines.",
    steps: [
      { name: "Training a Helpful and Harmless Assistant with RLHF", track: "academic_papers", why: "The engineering of an RLHF safety pipeline, end to end." },
      { name: "Red Teaming Language Models to Reduce Harms", track: "academic_papers", why: "A repeatable methodology for finding model failures." },
      { name: "Discovering Latent Knowledge in Language Models Without Supervision", track: "academic_papers", why: "An interpretability method aimed at detecting what a model 'believes'." },
      { name: "Robert Miles AI Safety", track: "youtube", why: "Concise technical explainers to fill conceptual gaps as you go." },
      { name: "LessWrong", track: "websites", why: "Where much of the technical alignment discussion happens in the open." },
    ],
  },
  {
    slug: "policymakers",
    audience: "I'm a policymaker",
    title: "AI safety for policymakers",
    blurb: "Governance, risk, and coordination—what decision-makers need to grasp.",
    description:
      "An orientation for people working on or around AI policy: the nature of the risk, why coordination is hard, and the governance proposals on the table.",
    steps: [
      { name: "Human Compatible", why: "A policymaker-friendly account of the control problem from a leading AI researcher." },
      { name: "The Windfall Clause", track: "academic_papers", why: "A concrete governance mechanism for sharing the gains and easing race dynamics." },
      { name: "The Vulnerable World Hypothesis", track: "academic_papers", why: "Why some technologies may demand unprecedented global governance." },
      { name: "Is Power-Seeking AI an Existential Risk?", track: "academic_papers", why: "The step-by-step risk argument, laid out for scrutiny." },
      { name: "80,000 Hours Podcast", track: "podcasts", why: "Long-form interviews mapping the governance landscape and how to act on it." },
    ],
  },
  {
    slug: "watch-and-read-for-fun",
    audience: "I just want stories",
    title: "Watch & read for fun",
    blurb: "The best films, TV, and fiction about AI—no homework required.",
    description:
      "Pure story. The films, series, and novels that dramatize machine minds, agency, and the alignment problem—an enjoyable way in that happens to teach the core ideas.",
    steps: [
      { name: "Ex Machina", track: "films", why: "A near-perfect chamber piece on the alignment test." },
      { name: "I, Robot", track: "fiction_books", why: "Asimov's robot stories are the original alignment case studies." },
      { name: "Humans", track: "tv", why: "A grounded near-future drama about personhood, control, and the minds we build." },
      { name: "AlphaGo", track: "documentaries", why: "The real-world match that felt like science fiction." },
    ],
  },
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
