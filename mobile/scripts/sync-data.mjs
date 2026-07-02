// Regenerates src/data/app-data.json from the repo's canonical dataset.
// Run from mobile/: `npm run sync-data`, then commit the output.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

const dataset = JSON.parse(readFileSync(join(repoRoot, "data", "resources.json"), "utf8"));
const { PATHS } = await import(join(repoRoot, "scripts", "lib", "resources.mjs"));

const resources = dataset.resources.map((r) => ({
  id: `${r.track}|${r.Link}`,
  name: r.Name,
  author: r.Author ?? "",
  link: r.Link,
  image: r.Image ?? "",
  year: typeof r.Year === "number" ? r.Year : null,
  level: r.level || r.Level || "",
  summary: r.Summary ?? "",
  track: r.track,
  trackLabel: r.trackLabel,
  tags: r.tags ?? [],
  timeLabel: r.timeLabel ?? "",
}));

const byNameTrack = new Map(resources.map((r) => [`${r.track}::${r.name}`, r]));
const byName = new Map();
for (const r of resources) if (!byName.has(r.name)) byName.set(r.name, r);

const paths = PATHS.map((p) => ({
  slug: p.slug,
  audience: p.audience,
  title: p.title,
  blurb: p.blurb,
  description: p.description,
  steps: p.steps.map((s) => {
    const match = s.track ? byNameTrack.get(`${s.track}::${s.name}`) : byName.get(s.name);
    if (!match) throw new Error(`Path "${p.slug}" step not found in dataset: ${s.name}`);
    return { resourceId: match.id, why: s.why };
  }),
}));

const out = {
  count: resources.length,
  tracks: dataset.tracks,
  resources,
  paths,
};

const outPath = join(here, "..", "src", "data", "app-data.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(`Wrote ${outPath}: ${resources.length} resources, ${paths.length} paths`);
