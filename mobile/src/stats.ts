import { getResource, isPerInstalment, LEVELS, parseMinutes, paths, resources, tracks } from "./data";
import type { LibraryEntry } from "./store/library";
import type { LearningPath, Track } from "./types";

// Everything the Progress screen shows, derived from the bundled dataset and
// the reader's own shelves. Pure functions of (entries, now) so the screen
// stays a thin renderer.

export interface CountPair {
  finished: number;
  total: number;
}

export interface LibraryStats {
  want: number;
  reading: number;
  finished: number;
  /** Minutes of the finished shelf, from each resource's listed length. */
  minutes: number;
  /** Finished resources whose listed length couldn't be read as a duration. */
  unestimated: number;
  /** Finished resources timed per episode/video, so the total undercounts. */
  perInstalment: number;
  finishedThisMonth: number;
  byTrack: (CountPair & { track: Track })[];
  byLevel: (CountPair & { level: string })[];
  byPath: (CountPair & { path: LearningPath })[];
  tracksExplored: number;
  topTags: { tag: string; count: number }[];
  rated: number;
  averageRating: number;
  notes: number;
}

function startOfMonth(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function computeStats(
  entries: Record<string, LibraryEntry>,
  now: number = Date.now()
): LibraryStats {
  const monthStart = startOfMonth(now);

  let want = 0;
  let reading = 0;
  let finished = 0;
  let minutes = 0;
  let unestimated = 0;
  let perInstalment = 0;
  let finishedThisMonth = 0;
  let rated = 0;
  let ratingSum = 0;
  let notes = 0;

  const finishedByTrack = new Map<string, number>();
  const finishedByLevel = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const [id, entry] of Object.entries(entries)) {
    if (entry.shelf === "want") want += 1;
    if (entry.shelf === "reading") reading += 1;
    if (entry.rating > 0) {
      rated += 1;
      ratingSum += entry.rating;
    }
    if (entry.note.trim()) notes += 1;
    if (entry.shelf !== "finished") continue;

    finished += 1;
    if (entry.finishedAt && entry.finishedAt >= monthStart) finishedThisMonth += 1;

    const resource = getResource(id);
    if (!resource) continue;
    finishedByTrack.set(resource.track, (finishedByTrack.get(resource.track) ?? 0) + 1);
    finishedByLevel.set(resource.level, (finishedByLevel.get(resource.level) ?? 0) + 1);
    for (const tag of resource.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);

    const parsed = parseMinutes(resource.timeLabel);
    if (parsed === null) unestimated += 1;
    else {
      minutes += parsed;
      if (isPerInstalment(resource.timeLabel)) perInstalment += 1;
    }
  }

  const levelTotals = new Map<string, number>();
  for (const resource of resources) {
    levelTotals.set(resource.level, (levelTotals.get(resource.level) ?? 0) + 1);
  }

  const byTrack = tracks
    .map((track) => ({
      track,
      finished: finishedByTrack.get(track.key) ?? 0,
      total: track.count,
    }))
    .sort((a, b) => b.finished - a.finished || a.track.label.localeCompare(b.track.label));

  const byLevel = LEVELS.map((level) => ({
    level,
    finished: finishedByLevel.get(level) ?? 0,
    total: levelTotals.get(level) ?? 0,
  }));

  const byPath = paths.map((path) => ({
    path,
    finished: path.steps.filter((s) => entries[s.resourceId]?.shelf === "finished").length,
    total: path.steps.length,
  }));

  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 6);

  return {
    want,
    reading,
    finished,
    minutes,
    unestimated,
    perInstalment,
    finishedThisMonth,
    byTrack,
    byLevel,
    byPath,
    tracksExplored: byTrack.filter((t) => t.finished > 0).length,
    topTags,
    rated,
    averageRating: rated ? ratingSum / rated : 0,
    notes,
  };
}
