import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "ai-safety-resources/library/v2";
const LEGACY_KEY = "ai-safety-resources/library/v1";

// Persisting on every keystroke of a note would hit disk dozens of times a
// sentence, so writes coalesce. Shelf and rating changes ride along; the delay
// is far shorter than the time it takes to leave a screen.
const WRITE_DEBOUNCE_MS = 400;

export type Shelf = "want" | "reading" | "finished";

export const SHELVES: Shelf[] = ["want", "reading", "finished"];

export interface LibraryEntry {
  shelf: Shelf;
  /** 0 when the user hasn't rated it; 1-5 otherwise. */
  rating: number;
  /** The user's own note. Private to the device — it never leaves it. */
  note: string;
  addedAt: number;
  finishedAt: number | null;
}

interface LibraryState {
  entries: Record<string, LibraryEntry>;
  /** Resources the user aims to finish per month; 0 means no goal set. */
  goal: number;
}

interface LibraryContextValue extends LibraryState {
  ready: boolean;
  getEntry: (id: string) => LibraryEntry | undefined;
  shelfOf: (id: string) => Shelf | null;
  /** Moves a resource between shelves; `null` takes it out of the library. */
  setShelf: (id: string, shelf: Shelf | null) => void;
  setRating: (id: string, rating: number) => void;
  setNote: (id: string, note: string) => void;
  setGoal: (goal: number) => void;
  /** Ids on a shelf, most recently finished (or added) first. */
  idsOn: (shelf: Shelf) => string[];
  isFinished: (id: string) => boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const EMPTY: LibraryState = { entries: {}, goal: 0 };

function isShelf(value: unknown): value is Shelf {
  return value === "want" || value === "reading" || value === "finished";
}

function sanitizeEntry(value: unknown): LibraryEntry | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!isShelf(raw.shelf)) return null;
  return {
    shelf: raw.shelf,
    rating:
      typeof raw.rating === "number" ? Math.min(5, Math.max(0, Math.round(raw.rating))) : 0,
    note: typeof raw.note === "string" ? raw.note : "",
    addedAt: typeof raw.addedAt === "number" ? raw.addedAt : 0,
    finishedAt: typeof raw.finishedAt === "number" ? raw.finishedAt : null,
  };
}

function sanitize(value: unknown): LibraryState {
  if (!value || typeof value !== "object") return EMPTY;
  const raw = value as Record<string, unknown>;
  const entries: Record<string, LibraryEntry> = {};
  if (raw.entries && typeof raw.entries === "object") {
    for (const [id, entry] of Object.entries(raw.entries as Record<string, unknown>)) {
      const clean = sanitizeEntry(entry);
      if (clean) entries[id] = clean;
    }
  }
  const goal = typeof raw.goal === "number" ? Math.min(99, Math.max(0, Math.round(raw.goal))) : 0;
  return { entries, goal };
}

// v1 stored two flat id lists. Fold them into entries so an existing install
// keeps its list: finished wins over saved, and both land with an unknown
// timestamp (0), which sorts them below anything shelved since.
function migrateLegacy(value: unknown): LibraryState {
  if (!value || typeof value !== "object") return EMPTY;
  const raw = value as Record<string, unknown>;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const entries: Record<string, LibraryEntry> = {};
  for (const id of list(raw.saved)) {
    entries[id] = { shelf: "want", rating: 0, note: "", addedAt: 0, finishedAt: null };
  }
  for (const id of list(raw.finished)) {
    entries[id] = { shelf: "finished", rating: 0, note: "", addedAt: 0, finishedAt: null };
  }
  return { entries, goal: 0 };
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryState>(EMPTY);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, LEGACY_KEY])
      .then((pairs) => {
        const stored = Object.fromEntries(pairs) as Record<string, string | null>;
        if (stored[STORAGE_KEY]) {
          setState(sanitize(JSON.parse(stored[STORAGE_KEY] as string)));
        } else if (stored[LEGACY_KEY]) {
          setState(migrateLegacy(JSON.parse(stored[LEGACY_KEY] as string)));
        }
      })
      .catch(() => {
        // Corrupt or unreadable storage: start fresh rather than crash.
      })
      .finally(() => {
        hydrated.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, WRITE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const update = useCallback(
    (id: string, patch: (entry: LibraryEntry) => LibraryEntry | null) =>
      setState((prev) => {
        const current: LibraryEntry = prev.entries[id] ?? {
          shelf: "want",
          rating: 0,
          note: "",
          addedAt: Date.now(),
          finishedAt: null,
        };
        const next = patch(current);
        const entries = { ...prev.entries };
        if (next) entries[id] = next;
        else delete entries[id];
        return { ...prev, entries };
      }),
    []
  );

  const setShelf = useCallback(
    (id: string, shelf: Shelf | null) =>
      update(id, (entry) => {
        // Taking something out of the library drops its note and rating too;
        // both only mean anything attached to a shelf.
        if (shelf === null) return null;
        return {
          ...entry,
          shelf,
          addedAt: entry.addedAt || Date.now(),
          // Stamp the finish so Progress can count what landed this month.
          finishedAt: shelf === "finished" ? entry.finishedAt ?? Date.now() : null,
        };
      }),
    [update]
  );

  const setRating = useCallback(
    (id: string, rating: number) =>
      update(id, (entry) => ({
        ...entry,
        // Tapping the star you already gave clears the rating.
        rating: entry.rating === rating ? 0 : Math.min(5, Math.max(0, rating)),
      })),
    [update]
  );

  const setNote = useCallback(
    (id: string, note: string) => update(id, (entry) => ({ ...entry, note })),
    [update]
  );

  const setGoal = useCallback(
    (goal: number) => setState((prev) => ({ ...prev, goal: Math.min(99, Math.max(0, goal)) })),
    []
  );

  const value = useMemo<LibraryContextValue>(() => {
    const { entries, goal } = state;
    const idsOn = (shelf: Shelf) =>
      Object.entries(entries)
        .filter(([, entry]) => entry.shelf === shelf)
        .sort((a, b) => (b[1].finishedAt ?? b[1].addedAt) - (a[1].finishedAt ?? a[1].addedAt))
        .map(([id]) => id);

    return {
      entries,
      goal,
      ready,
      getEntry: (id) => entries[id],
      shelfOf: (id) => entries[id]?.shelf ?? null,
      setShelf,
      setRating,
      setNote,
      setGoal,
      idsOn,
      isFinished: (id) => entries[id]?.shelf === "finished",
    };
  }, [state, ready, setShelf, setRating, setNote, setGoal]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
