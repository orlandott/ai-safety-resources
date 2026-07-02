#!/usr/bin/env node
//
// Build pipeline for ai-safety-resources.com.
//
// `public/resources.js` is the canonical, hand-edited source of truth. This
// script derives everything else from it so the data stays in one place:
//
//   1. validates every entry against a small schema (fails the build on error)
//   2. data/resources.json        - machine-readable export of the dataset
//   3. data/search-index.json     - lightweight search index (title/author/...)
//   4. public/index.html          - server-rendered resource cards injected into
//                                    each category pane (SEO + no-JS fallback),
//                                    plus an ItemList JSON-LD for the categories
//   5. public/<slug>/index.html   - a static, crawlable page per category
//   6. public/sitemap.xml         - homepage + one URL per category page
//
// Usage:
//   node scripts/build.mjs          validate + write all outputs
//   node scripts/build.mjs --check  validate only, no writes (CI gate)

import fs from "node:fs";
import path from "node:path";
import {
  workspaceRoot,
  TRACKS,
  TRACK_BY_KEY,
  VALID_CATEGORIES,
  SITE_ORIGIN,
  loadResources,
  loadFictionTitles,
  bucketKey,
  groupByTrack,
  escapeHtml,
  isValidHttpUrl,
  tagsFor,
  TOPIC_TAGS,
  VALID_LEVELS,
  levelFor,
  timeLabelFor,
  metaPillsFor,
  TOPIC_PAGES,
  PATHS,
  DATASET_UPDATED,
} from "./lib/resources.mjs";

const CHECK_ONLY = process.argv.includes("--check");
const publicDir = path.join(workspaceRoot, "public");
const dataDir = path.join(workspaceRoot, "data");
const indexPath = path.join(publicDir, "index.html");

const writes = [];
const queueWrite = (filePath, content) => writes.push({ filePath, content });

// ── 1. Validation ───────────────────────────────────────────────────────────

function validate(resources, fictionTitles) {
  const errors = [];
  const seenLinks = new Map();
  resources.forEach((entry, i) => {
    const where = `entry #${i} (${entry.Name || "<no Name>"})`;
    if (!entry.Name || typeof entry.Name !== "string") {
      errors.push(`${where}: missing or invalid "Name"`);
    }
    const track = bucketKey(entry, fictionTitles);
    if (!isValidHttpUrl(entry.Link)) {
      errors.push(`${where}: missing or invalid "Link" (${entry.Link})`);
    } else {
      // A resource may be cross-listed in two tracks (e.g. a film that is also
      // a documentary); only the same link within the same track is a dupe.
      const dupeKey = `${track}|${entry.Link}`;
      const prev = seenLinks.get(dupeKey);
      if (prev !== undefined) {
        errors.push(`${where}: duplicate Link within track "${track}" also used by entry #${prev}`);
      } else {
        seenLinks.set(dupeKey, i);
      }
    }
    if (!VALID_CATEGORIES.has((entry.Category || "").toString())) {
      errors.push(`${where}: invalid "Category" (${entry.Category})`);
    } else if (!track) {
      errors.push(`${where}: Category "${entry.Category}" does not map to a track`);
    }
    if (entry.Year !== undefined) {
      const y = Number(entry.Year);
      if (!Number.isInteger(y) || y < 1800 || y > 2100) {
        errors.push(`${where}: "Year" out of range (${entry.Year})`);
      }
    }
    if (entry.page_count !== undefined) {
      const p = Number(entry.page_count);
      if (!Number.isInteger(p) || p < 0) {
        errors.push(`${where}: "page_count" must be a non-negative integer (${entry.page_count})`);
      }
    }
    if (entry.Summary !== undefined && typeof entry.Summary !== "string") {
      errors.push(`${where}: "Summary" must be a string`);
    }
    if (entry.Level !== undefined && !VALID_LEVELS.includes(entry.Level)) {
      errors.push(`${where}: "Level" must be one of ${VALID_LEVELS.join(", ")} (${entry.Level})`);
    }
    for (const field of ["ExcludeTopics", "IncludeTopics"]) {
      if (entry[field] === undefined) continue;
      const validTags = new Set(TOPIC_TAGS.map((t) => t.tag));
      if (!Array.isArray(entry[field])) {
        errors.push(`${where}: "${field}" must be an array of topic tags`);
      } else {
        for (const tag of entry[field]) {
          if (!validTags.has(tag)) {
            errors.push(`${where}: "${field}" has unknown topic tag "${tag}"`);
          }
        }
      }
    }
    if (entry.Minutes !== undefined) {
      const m = Number(entry.Minutes);
      if (!Number.isInteger(m) || m < 0) {
        errors.push(`${where}: "Minutes" must be a non-negative integer (${entry.Minutes})`);
      }
    }
  });
  return errors;
}

// ── 2/3. Data exports ───────────────────────────────────────────────────────

// Augment every entry with its derived track, tags, level, and time label.
// Computed once and reused by the data exports and the topic pages.
function enrichResources(resources, fictionTitles) {
  return resources.map((entry) => {
    const key = bucketKey(entry, fictionTitles);
    return {
      ...entry,
      track: key,
      trackLabel: TRACK_BY_KEY.get(key)?.label || "",
      tags: tagsFor(entry, key),
      level: levelFor(entry, key),
      timeLabel: timeLabelFor(entry, key),
    };
  });
}

function buildDataExports(enriched, groups) {
  const tracks = TRACKS.map((t) => ({
    key: t.key,
    label: t.label,
    slug: t.slug,
    count: groups.get(t.key).length,
  }));

  queueWrite(
    path.join(dataDir, "resources.json"),
    JSON.stringify(
      { count: enriched.length, generatedFrom: "public/resources.js", tracks, resources: enriched },
      null,
      2
    ) + "\n"
  );

  const searchIndex = enriched.map((e) => ({
    name: e.Name || "",
    author: e.Author || "",
    summary: e.Summary || "",
    track: e.track,
    trackLabel: e.trackLabel,
    link: e.Link || "",
    year: e.Year ?? null,
    tags: e.tags,
    level: e.level,
    timeLabel: e.timeLabel,
  }));
  queueWrite(path.join(dataDir, "search-index.json"), JSON.stringify(searchIndex) + "\n");

  // Client-side tag map (keyed by resource Name) so script.js can fold tags
  // into its search text without bloating the canonical resources.js.
  const tagMap = {};
  for (const e of enriched) {
    if (e.tags.length && e.Name) tagMap[e.Name] = e.tags;
  }
  queueWrite(
    path.join(publicDir, "resource-tags.js"),
    `// Generated by scripts/build.mjs — do not edit by hand.\n` +
      `window.RESOURCE_TAGS = ${JSON.stringify(tagMap)};\n`
  );
}

// ── 4/5. Server-rendered HTML ───────────────────────────────────────────────

// `track` lets the card derive its metadata pills (difficulty + time). It is
// optional so callers without a known track still render a valid card.
// `headingLevel` keeps the outline sane in each context: h2 on standalone
// pages (under the page h1), h4 inside the homepage panes (under the h3
// category intros, matching the hydrated cards).
function ssrCard(entry, track, headingLevel = 2) {
  const name = escapeHtml(entry.Name || "Untitled");
  const author = entry.Author ? `<span class="ssr-card-author">${escapeHtml(entry.Author)}</span>` : "";
  const summary = entry.Summary ? `<p class="ssr-card-summary">${escapeHtml(entry.Summary)}</p>` : "";
  const link = escapeHtml(entry.Link || "#");
  const pills = track ? metaPillsFor(entry, track) : [];
  const year = entry.Year ? [{ kind: "year", text: String(entry.Year) }] : [];
  const meta = [...pills, ...year]
    .map((p) => `<span class="ssr-card-pill ssr-card-pill-${p.kind}">${escapeHtml(p.text)}</span>`)
    .join("");
  const metaRow = meta ? `<span class="ssr-card-meta">${meta}</span>` : "";
  return (
    `<article class="ssr-card">` +
    `<h${headingLevel} class="ssr-card-heading"><a class="ssr-card-link" href="${link}" target="_blank" rel="noopener noreferrer">${name}</a></h${headingLevel}>` +
    author +
    summary +
    metaRow +
    `</article>`
  );
}

// No wrapping <div>: the injection below matches the pane's closing </div> with
// a non-greedy pattern, so the server-rendered cards must not contain a <div>.
function ssrPaneMarkup(entries, track) {
  if (!entries.length) return "";
  return entries.map((e) => ssrCard(e, track, 4)).join("");
}

// Replace the inner HTML of a `<div id="PANE" class="gauntlet-wrapper">…</div>`.
function injectPane(html, pane, inner) {
  const re = new RegExp(`(<div id="${pane}" class="gauntlet-wrapper">)[\\s\\S]*?(</div>)`);
  if (!re.test(html)) {
    throw new Error(`Could not find pane container for "${pane}" in index.html`);
  }
  return html.replace(re, `$1${inner}$2`);
}

function categoryItemListJsonLd() {
  const itemListElement = TRACKS.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE_ORIGIN}/${t.slug}/`,
    name: t.label,
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI Safety Resources categories",
    itemListElement,
  };
}

function injectHomepage(html, groups) {
  for (const t of TRACKS) {
    html = injectPane(html, t.pane, ssrPaneMarkup(groups.get(t.key), t.key));
  }
  // Idempotently (re)insert the category ItemList JSON-LD before </head>.
  // Single-line tag so the removal regex strips it exactly, leaving no residue.
  const tag =
    `  <script type="application/ld+json" data-build="category-list">` +
    `${JSON.stringify(categoryItemListJsonLd())}</script>\n`;
  html = html.replace(
    /^[ \t]*<script type="application\/ld\+json" data-build="category-list">[\s\S]*?<\/script>\n/m,
    ""
  );
  html = html.replace(/([ \t]*)<\/head>/, `${tag}$1</head>`);
  return html;
}

// Shared chrome for every server-rendered standalone page (category, topic,
// path, and the hubs). `main` is the inner <main> markup; `jsonLd` is an
// optional structured-data object embedded before </head>.
function renderPage({ title, description, url, jsonLd, mainClass, main }) {
  const ld = jsonLd
    ? `  <script type="application/ld+json">\n  ${JSON.stringify(jsonLd)}\n  </script>\n`
    : "";
  const footerCategoryLinks = TRACKS.map(
    (t) => `<a href="/${t.slug}/">${escapeHtml(t.label)}</a>`
  ).join("\n        ");
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${SITE_ORIGIN}/images/logo-ai-safety-resources.png" />
  <meta property="og:site_name" content="AI Safety Resources" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${SITE_ORIGIN}/images/logo-ai-safety-resources.png" />
  <meta content="width=device-width, initial-scale=1" name="viewport" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta name="theme-color" content="#f4f1ea" />
${ld}  <script src="/theme-init.js"></script>
  <link href="/images/favicon.png" rel="icon" type="image/png" />
  <link href="/images/favicon.png" rel="apple-touch-icon" />
  <link href="/style.css" rel="stylesheet" type="text/css" />
  <script src="/theme-toggle.js" defer></script>
</head>
<body class="site-body">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <nav class="site-nav" aria-label="Main">
      <a href="/" class="brand">
        <img src="/images/logo-ai-safety-resources.png" width="128" alt="AI Safety Resources" class="nav-logo" />
      </a>
      <div class="nav-actions">
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch to dark theme">
          <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </button>
      </div>
    </nav>
  </header>
  <main id="main-content" class="page ${mainClass}">
${main}
  </main>
  <footer class="site-footer">
    <div class="site-footer-inner">
      <div class="site-footer-brand">
        <p class="site-footer-title"><a href="/">AI Safety Resources</a></p>
        <p class="site-footer-copy">
          A community-maintained collection of books, papers, films, podcasts, and websites to explore and enjoy the questions of AI safety and alignment.
        </p>
      </div>
      <nav class="site-footer-links" aria-label="Footer">
        <a href="/paths/">Learning paths</a>
        <a href="/topics/">Topics</a>
        ${footerCategoryLinks}
      </nav>
    </div>
    <p class="site-footer-fineprint">Free, forever. Your saved resources live only in your browser.</p>
  </footer>
</body>
</html>
`;
}

function itemListJsonLd(name, description, entries) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: e.Link,
      name: e.Name,
    })),
  };
}

function breadcrumbMarkup(trail) {
  const parts = trail.map((t, i) => {
    const last = i === trail.length - 1;
    return last
      ? `<span>${escapeHtml(t.label)}</span>`
      : `<a href="${t.href}">${escapeHtml(t.label)}</a>`;
  });
  return `    <nav class="category-page-breadcrumb" aria-label="Breadcrumb">\n      ${parts.join(" / ")}\n    </nav>`;
}

function categoryPage(track, entries) {
  const title = `${track.label} – AI Safety Resources`;
  const desc = track.intro;
  const url = `${SITE_ORIGIN}/${track.slug}/`;
  const cards = entries.map((e) => ssrCard(e, track.key)).join("\n      ");
  const main = [
    breadcrumbMarkup([{ label: "All resources", href: "/" }, { label: track.label }]),
    `    <h1 class="hero-title">${escapeHtml(track.label)}</h1>`,
    `    <p class="hero-copy">${escapeHtml(desc)}</p>`,
    `    <p class="category-page-cta"><a href="/#tab-${track.pane.replace(/-parent$/, "")}">Browse this category in the interactive library →</a></p>`,
    `    <div class="ssr-list" data-ssr>\n      ${cards}\n    </div>`,
  ].join("\n");
  return renderPage({
    title,
    description: desc,
    url,
    jsonLd: itemListJsonLd(track.label, desc, entries),
    mainClass: "category-page",
    main,
  });
}

// ── Topic landing pages ─────────────────────────────────────────────────────

function topicPage(topic, entries) {
  const title = `${topic.seoTitle} – AI Safety Resources`;
  const url = `${SITE_ORIGIN}/topics/${topic.slug}/`;
  const cards = entries.map((e) => ssrCard(e, e.track)).join("\n      ");
  const body = entries.length
    ? `    <div class="ssr-list" data-ssr>\n      ${cards}\n    </div>`
    : `    <p class="hero-copy">No resources tagged yet—check back soon.</p>`;
  const main = [
    breadcrumbMarkup([
      { label: "All resources", href: "/" },
      { label: "Topics", href: "/topics/" },
      { label: topic.h1 },
    ]),
    `    <h1 class="hero-title">${escapeHtml(topic.h1)}</h1>`,
    `    <p class="hero-copy">${escapeHtml(topic.description)}</p>`,
    `    <p class="category-page-cta"><a href="/">Browse the full interactive library →</a></p>`,
    body,
  ].join("\n");
  return renderPage({
    title,
    description: topic.description,
    url,
    jsonLd: itemListJsonLd(topic.seoTitle, topic.description, entries),
    mainClass: "category-page",
    main,
  });
}

function topicsHub(topicsWithCounts) {
  const title = "AI Safety Topics – Browse by Subject";
  const desc =
    "Browse AI safety resources by topic: interpretability, alignment, governance, existential risk, deception, forecasting, and more.";
  const url = `${SITE_ORIGIN}/topics/`;
  const cards = topicsWithCounts
    .map(
      (t) =>
        `<a class="hub-card" href="/topics/${t.slug}/">` +
        `<span class="hub-card-title">${escapeHtml(t.h1)}</span>` +
        `<span class="hub-card-meta">${t.count} resource${t.count === 1 ? "" : "s"}</span>` +
        `<span class="hub-card-desc">${escapeHtml(t.description)}</span>` +
        `</a>`
    )
    .join("\n      ");
  const main = [
    breadcrumbMarkup([{ label: "All resources", href: "/" }, { label: "Topics" }]),
    `    <h1 class="hero-title">Browse by topic</h1>`,
    `    <p class="hero-copy">${escapeHtml(desc)}</p>`,
    `    <div class="hub-grid">\n      ${cards}\n    </div>`,
  ].join("\n");
  return renderPage({ title, description: desc, url, mainClass: "category-page", main });
}

// ── Learning path pages ─────────────────────────────────────────────────────

function pathPage(pathDef, steps) {
  const title = `${pathDef.title} – A Learning Path | AI Safety Resources`;
  const url = `${SITE_ORIGIN}/paths/${pathDef.slug}/`;
  const items = steps
    .map((s, i) => {
      const label = escapeHtml(TRACK_BY_KEY.get(s.track)?.label || "");
      const pills = metaPillsFor(s.entry, s.track)
        .map((p) => `<span class="ssr-card-pill ssr-card-pill-${p.kind}">${escapeHtml(p.text)}</span>`)
        .join("");
      return (
        `<li class="path-step">` +
        `<span class="path-step-num" aria-hidden="true">${i + 1}</span>` +
        `<div class="path-step-body">` +
        `<a class="path-step-link" href="${escapeHtml(s.entry.Link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.entry.Name)}</a>` +
        `<span class="path-step-kind">${label}${pills ? ` <span class="ssr-card-meta">${pills}</span>` : ""}</span>` +
        `<p class="path-step-why">${escapeHtml(s.why)}</p>` +
        `</div></li>`
      );
    })
    .join("\n      ");
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pathDef.title,
    description: pathDef.description,
    numberOfItems: steps.length,
    itemListElement: steps.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: s.entry.Link,
      name: s.entry.Name,
    })),
  };
  const main = [
    breadcrumbMarkup([
      { label: "All resources", href: "/" },
      { label: "Learning paths", href: "/paths/" },
      { label: pathDef.title },
    ]),
    `    <h1 class="hero-title">${escapeHtml(pathDef.title)}</h1>`,
    `    <p class="hero-copy">${escapeHtml(pathDef.description)}</p>`,
    `    <ol class="path-steps">\n      ${items}\n    </ol>`,
    `    <p class="category-page-cta"><a href="/paths/">See all learning paths →</a></p>`,
  ].join("\n");
  return renderPage({
    title,
    description: pathDef.description,
    url,
    jsonLd: itemList,
    mainClass: "category-page path-page",
    main,
  });
}

function pathsHub(paths) {
  const title = "AI Safety Learning Paths – Where to Start";
  const desc =
    "Curated, step-by-step learning paths into AI safety for newcomers, technical people, policymakers, and the simply curious.";
  const url = `${SITE_ORIGIN}/paths/`;
  const cards = paths
    .map(
      (p) =>
        `<a class="hub-card" href="/paths/${p.slug}/">` +
        `<span class="hub-card-kind">${escapeHtml(p.audience)}</span>` +
        `<span class="hub-card-title">${escapeHtml(p.title)}</span>` +
        `<span class="hub-card-desc">${escapeHtml(p.blurb)}</span>` +
        `</a>`
    )
    .join("\n      ");
  const main = [
    breadcrumbMarkup([{ label: "All resources", href: "/" }, { label: "Learning paths" }]),
    `    <h1 class="hero-title">Where do I start?</h1>`,
    `    <p class="hero-copy">${escapeHtml(desc)}</p>`,
    `    <div class="hub-grid">\n      ${cards}\n    </div>`,
  ].join("\n");
  return renderPage({ title, description: desc, url, mainClass: "category-page", main });
}

// Resolve a curated reference ({name, track?}) to a real dataset entry, failing
// the build on a name/track mismatch so a typo is caught at build time rather
// than silently dropping a card. Shared by the start-here on-ramp and the
// learning paths.
function resolveReference(ref, label, resources, fictionTitles) {
  const matches = resources.filter((e) => e.Name === ref.name);
  const entry = ref.track
    ? matches.find((e) => bucketKey(e, fictionTitles) === ref.track)
    : matches[0];
  if (!entry) {
    throw new Error(
      `${label} not found in dataset: "${ref.name}"${ref.track ? ` (track ${ref.track})` : ""}`
    );
  }
  return { ...ref, entry, track: bucketKey(entry, fictionTitles) };
}

// Resolve every learning path's steps against the dataset. Returns the PATHS
// definitions augmented with a resolved `steps` array.
function resolvePaths(resources, fictionTitles) {
  return PATHS.map((p) => ({
    ...p,
    steps: p.steps.map((s) =>
      resolveReference(s, `Learning-path step (${p.slug})`, resources, fictionTitles)
    ),
  }));
}

// Inject the "Choose your path" chooser cards into the homepage marker section.
function injectPaths(html, resolvedPaths) {
  const cards = resolvedPaths
    .map(
      (p) =>
        `<a class="path-card" href="/paths/${p.slug}/">` +
        `<span class="path-card-kind">${escapeHtml(p.audience)}</span>` +
        `<span class="path-card-title">${escapeHtml(p.title)}</span>` +
        `<span class="path-card-why">${escapeHtml(p.blurb)}</span>` +
        `</a>`
    )
    .join("");
  const re = /(<div class="paths-grid" data-build="paths">)[\s\S]*?(<\/div>)/;
  if (!re.test(html)) {
    throw new Error('Could not find the paths container (data-build="paths") in index.html');
  }
  return html.replace(re, `$1${cards}$2`);
}

function sitemapXml() {
  const urls = [
    { loc: `${SITE_ORIGIN}/`, priority: "1.0" },
    { loc: `${SITE_ORIGIN}/paths/`, priority: "0.9" },
    ...PATHS.map((p) => ({ loc: `${SITE_ORIGIN}/paths/${p.slug}/`, priority: "0.8" })),
    { loc: `${SITE_ORIGIN}/topics/`, priority: "0.9" },
    ...TOPIC_PAGES.map((t) => ({ loc: `${SITE_ORIGIN}/topics/${t.slug}/`, priority: "0.8" })),
    ...TRACKS.map((t) => ({ loc: `${SITE_ORIGIN}/${t.slug}/`, priority: "0.8" })),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${DATASET_UPDATED}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ── Orchestration ───────────────────────────────────────────────────────────

function main() {
  const resources = loadResources();
  const fictionTitles = loadFictionTitles();

  const errors = validate(resources, fictionTitles);
  if (errors.length) {
    console.error(`✗ Validation failed (${errors.length} error(s)):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const groups = groupByTrack(resources, fictionTitles);
  console.log(`✓ Validated ${resources.length} resources across ${TRACKS.length} tracks.`);

  if (CHECK_ONLY) {
    console.log("✓ Check passed (no files written).");
    return;
  }

  const enriched = enrichResources(resources, fictionTitles);
  buildDataExports(enriched, groups);

  const resolvedPaths = resolvePaths(resources, fictionTitles);

  let html = fs.readFileSync(indexPath, "utf8");
  html = injectHomepage(html, groups);
  html = injectPaths(html, resolvedPaths);
  queueWrite(indexPath, html);

  for (const t of TRACKS) {
    queueWrite(path.join(publicDir, t.slug, "index.html"), categoryPage(t, groups.get(t.key)));
  }

  // Topic landing pages: one per topic plus a hub. Entries are every resource
  // carrying the matching derived tag, in source order. A resource cross-listed
  // in several tracks (same Link) would otherwise appear multiple times on the
  // page and duplicate its URL in the ItemList JSON-LD, so keep the first.
  const topicsWithCounts = TOPIC_PAGES.map((topic) => {
    const seenTopicLinks = new Set();
    const entries = enriched.filter((e) => {
      if (!e.tags.includes(topic.tag)) return false;
      if (seenTopicLinks.has(e.Link)) return false;
      seenTopicLinks.add(e.Link);
      return true;
    });
    queueWrite(
      path.join(publicDir, "topics", topic.slug, "index.html"),
      topicPage(topic, entries)
    );
    return { ...topic, count: entries.length };
  });
  queueWrite(path.join(publicDir, "topics", "index.html"), topicsHub(topicsWithCounts));

  // Learning-path pages: one per path plus a hub.
  for (const p of resolvedPaths) {
    queueWrite(path.join(publicDir, "paths", p.slug, "index.html"), pathPage(p, p.steps));
  }
  queueWrite(path.join(publicDir, "paths", "index.html"), pathsHub(resolvedPaths));

  queueWrite(path.join(publicDir, "sitemap.xml"), sitemapXml());

  for (const { filePath, content } of writes) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    console.log(`  wrote ${path.relative(workspaceRoot, filePath)}`);
  }
  console.log("✓ Build complete.");
}

main();
