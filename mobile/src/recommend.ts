import { getResource, paths, resources } from "./data";
import type { LibraryEntry } from "./store/library";
import type { Resource } from "./types";

// Everything here runs on the bundled dataset and the user's own shelves —
// no network, no account, nothing leaves the device. The point is that the
// app's suggestions come from what *this* reader has actually finished.

export interface Suggestion {
  resource: Resource;
  /** Short, human explanation of why this showed up. */
  reason: string;
}

const LEVEL_INDEX: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

// Tags are dataset slugs; these are the few that don't survive a naive
// de-hyphenation.
const TAG_LABELS: Record<string, string> = {
  llms: "large language models",
  rl: "reinforcement learning",
  "existential-risk": "existential risk",
};

function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/-/g, " ");
}

/** How much a shelved resource says about what the reader wants next. */
function affinity(entry: LibraryEntry): number {
  const base = entry.shelf === "finished" ? 3 : entry.shelf === "reading" ? 2 : 1;
  if (entry.rating >= 4) return base + 2;
  // An explicit low rating is a signal too — steer away from more of the same.
  if (entry.rating > 0 && entry.rating <= 2) return -base;
  return base;
}

interface Profile {
  tags: Map<string, number>;
  tracks: Map<string, number>;
  /** Mean level of what the reader engages with, on the 0-2 LEVEL_INDEX scale. */
  level: number;
  weighted: number;
}

function buildProfile(entries: Record<string, LibraryEntry>): Profile {
  const tags = new Map<string, number>();
  const tracks = new Map<string, number>();
  let levelSum = 0;
  let levelWeight = 0;
  let weighted = 0;

  for (const [id, entry] of Object.entries(entries)) {
    const resource = getResource(id);
    if (!resource) continue;
    const weight = affinity(entry);
    if (weight === 0) continue;
    weighted += Math.max(0, weight);
    for (const tag of resource.tags) tags.set(tag, (tags.get(tag) ?? 0) + weight);
    tracks.set(resource.track, (tracks.get(resource.track) ?? 0) + weight);
    if (weight > 0 && resource.level in LEVEL_INDEX) {
      levelSum += LEVEL_INDEX[resource.level] * weight;
      levelWeight += weight;
    }
  }

  return {
    tags,
    tracks,
    level: levelWeight ? levelSum / levelWeight : 0,
    weighted,
  };
}

function maxValue(map: Map<string, number>): number {
  let max = 0;
  for (const value of map.values()) max = Math.max(max, value);
  return max;
}

/**
 * The next unfinished step of every path the reader has already started, in
 * curator order. These are the strongest suggestions the app can make: someone
 * else already decided what comes next.
 */
function pathContinuations(entries: Record<string, LibraryEntry>): Suggestion[] {
  const out: Suggestion[] = [];
  for (const path of paths) {
    const started = path.steps.some((s) => entries[s.resourceId]?.shelf === "finished");
    if (!started) continue;
    const next = path.steps.find((s) => !entries[s.resourceId]);
    const resource = next ? getResource(next.resourceId) : undefined;
    if (resource) out.push({ resource, reason: `Next in ${path.title}` });
  }
  return out;
}

/** Where a reader with an empty library is pointed: the curator's own opener. */
function coldStart(limit: number): Suggestion[] {
  const opener = paths.find((p) => p.slug === "new-to-ai-safety") ?? paths[0];
  const steps = opener?.steps ?? [];
  const out: Suggestion[] = [];
  for (const step of steps) {
    const resource = getResource(step.resourceId);
    if (resource) out.push({ resource, reason: `Step ${out.length + 1} of ${opener.title}` });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Ranks everything the reader hasn't shelved yet against their taste profile,
 * then spreads the result across categories so the list isn't six papers.
 */
export function recommend(entries: Record<string, LibraryEntry>, limit = 6): Suggestion[] {
  const profile = buildProfile(entries);
  if (profile.weighted === 0) return coldStart(limit);

  const picked: Suggestion[] = [];
  const seen = new Set<string>();
  for (const suggestion of pathContinuations(entries)) {
    if (seen.has(suggestion.resource.id)) continue;
    seen.add(suggestion.resource.id);
    picked.push(suggestion);
    if (picked.length >= Math.ceil(limit / 2)) break;
  }

  const maxTag = maxValue(profile.tags) || 1;
  const maxTrack = maxValue(profile.tracks) || 1;

  const scored = resources
    .filter((r) => !entries[r.id] && !seen.has(r.id))
    .map((resource) => {
      let tagScore = 0;
      let bestTag = "";
      for (const tag of resource.tags) {
        const weight = profile.tags.get(tag) ?? 0;
        tagScore += weight / maxTag;
        if (weight > (profile.tags.get(bestTag) ?? 0)) bestTag = tag;
      }
      const trackScore = (profile.tracks.get(resource.track) ?? 0) / maxTrack;
      const levelGap = Math.abs((LEVEL_INDEX[resource.level] ?? 1) - profile.level);
      const levelScore = 1 - levelGap / 2;

      const score = tagScore * 4 + trackScore * 2 + levelScore * 1.5;
      const reason = bestTag
        ? `More on ${tagLabel(bestTag)}`
        : trackScore > 0
          ? `More ${resource.trackLabel.toLowerCase()}`
          : `${resource.level} — where you've been reading`;
      return { resource, reason, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.resource.name.localeCompare(b.resource.name));

  // Greedy pass with a per-category penalty, so one dominant track can't take
  // every slot.
  const usedTracks = new Map<string, number>();
  for (const suggestion of picked) {
    usedTracks.set(suggestion.resource.track, 1);
  }
  while (picked.length < limit) {
    let best: (typeof scored)[number] | null = null;
    let bestAdjusted = -Infinity;
    for (const candidate of scored) {
      if (seen.has(candidate.resource.id)) continue;
      const penalty = (usedTracks.get(candidate.resource.track) ?? 0) * 1.5;
      const adjusted = candidate.score - penalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        best = candidate;
      }
    }
    if (!best) break;
    seen.add(best.resource.id);
    usedTracks.set(best.resource.track, (usedTracks.get(best.resource.track) ?? 0) + 1);
    picked.push({ resource: best.resource, reason: best.reason });
  }

  return picked;
}

/**
 * Resources adjacent to the one being viewed — same author first, then shared
 * topics, category, and level. Used by the detail screen so a resource is a
 * jumping-off point rather than a dead end with a link on it.
 */
export function relatedTo(resource: Resource, limit = 4): Resource[] {
  const tags = new Set(resource.tags);
  return resources
    .filter((r) => r.id !== resource.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.author && candidate.author === resource.author) score += 6;
      for (const tag of candidate.tags) if (tags.has(tag)) score += 3;
      if (candidate.track === resource.track) score += 2;
      if (candidate.level === resource.level) score += 1;
      return { candidate, score };
    })
    .filter((c) => c.score > 2)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map((c) => c.candidate);
}
