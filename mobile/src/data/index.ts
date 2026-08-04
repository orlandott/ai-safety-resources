import type { AppData, LearningPath, Resource, Track } from "../types";
import rawData from "./app-data.json";

const data = rawData as AppData;

export const tracks: Track[] = data.tracks;
export const resources: Resource[] = data.resources;
export const paths: LearningPath[] = data.paths;

const byId = new Map(resources.map((r) => [r.id, r]));
const byTrack = new Map<string, Resource[]>(tracks.map((t) => [t.key, []]));
for (const r of resources) byTrack.get(r.track)?.push(r);

export function getResource(id: string): Resource | undefined {
  return byId.get(id);
}

export function getTrack(key: string): Track | undefined {
  return tracks.find((t) => t.key === key);
}

export function getTrackResources(key: string): Resource[] {
  return byTrack.get(key) ?? [];
}

export function getPath(slug: string): LearningPath | undefined {
  return paths.find((p) => p.slug === slug);
}

export const TRACK_ICONS: Record<string, string> = {
  non_fiction_books: "📚",
  fiction_books: "📖",
  academic_papers: "📄",
  courses: "🎓",
  films: "🎬",
  tv: "📺",
  documentaries: "🎥",
  podcasts: "🎧",
  websites: "🌐",
  youtube: "▶️",
};

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

// How you consume each category, so shelves can say "Want to watch" instead of
// a generic "Saved" and the Progress screen can talk about time the right way.
export const TRACK_VERBS: Record<string, "read" | "watch" | "listen" | "take"> = {
  non_fiction_books: "read",
  fiction_books: "read",
  academic_papers: "read",
  websites: "read",
  courses: "take",
  films: "watch",
  tv: "watch",
  documentaries: "watch",
  youtube: "watch",
  podcasts: "listen",
};

const VERB_PRESENT: Record<string, string> = {
  read: "Reading",
  watch: "Watching",
  listen: "Listening",
  take: "Taking",
};

/** "Want to read" / "Watching" / "Finished", phrased for the category. */
export function shelfLabel(shelf: "want" | "reading" | "finished", track: string): string {
  const verb = TRACK_VERBS[track] ?? "read";
  if (shelf === "want") return `Want to ${verb}`;
  if (shelf === "reading") return VERB_PRESENT[verb] ?? "Reading";
  return "Finished";
}

// timeLabel looks like "~40 min read", "~2.5 hr watch", "~25 min per episode".
// Anything with no label (26 of them) or an unfamiliar shape returns null so
// callers can leave it out of totals rather than guess.
const DURATION = /^~?\s*([\d.]+)\s*(min|mins|minute|minutes|hr|hrs|hour|hours)\b/i;

export function parseMinutes(timeLabel: string): number | null {
  const match = DURATION.exec(timeLabel ?? "");
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return /^h/i.test(match[2]) ? Math.round(value * 60) : Math.round(value);
}

/** True when the label times one instalment rather than the whole thing. */
export function isPerInstalment(timeLabel: string): boolean {
  return /\bper\b/i.test(timeLabel ?? "");
}

/** 95 -> "1 hr 35 min", 40 -> "40 min", 180 -> "3 hr". */
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

const normalized = (s: string) => s.toLowerCase();

export function searchResources(query: string, trackKey?: string): Resource[] {
  const q = normalized(query.trim());
  if (!q) return [];
  const terms = q.split(/\s+/);
  const pool = trackKey ? getTrackResources(trackKey) : resources;
  return pool
    .map((r) => {
      const name = normalized(r.name);
      const haystack = normalized(
        `${r.name} ${r.author} ${r.summary} ${r.tags.join(" ")} ${r.trackLabel}`
      );
      if (!terms.every((t) => haystack.includes(t))) return null;
      let score = 0;
      if (name === q) score += 100;
      else if (name.startsWith(q)) score += 50;
      else if (name.includes(q)) score += 25;
      if (normalized(r.author).includes(q)) score += 10;
      return { r, score };
    })
    .filter((x): x is { r: Resource; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}
