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
