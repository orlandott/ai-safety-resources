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

const STORAGE_KEY = "ai-safety-resources/library/v1";

interface LibraryState {
  saved: string[];
  finished: string[];
}

interface LibraryContextValue {
  saved: string[];
  finished: string[];
  isSaved: (id: string) => boolean;
  isFinished: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  toggleFinished: (id: string) => void;
  ready: boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function sanitize(value: unknown): LibraryState {
  const asArray = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const obj = (value ?? {}) as Record<string, unknown>;
  return { saved: asArray(obj.saved), finished: asArray(obj.finished) };
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryState>({ saved: [], finished: [] });
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setState(sanitize(JSON.parse(json)));
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const toggle = (list: keyof LibraryState, id: string) =>
    setState((prev) => {
      const has = prev[list].includes(id);
      return {
        ...prev,
        [list]: has ? prev[list].filter((x) => x !== id) : [...prev[list], id],
      };
    });

  const toggleSaved = useCallback((id: string) => toggle("saved", id), []);
  const toggleFinished = useCallback((id: string) => toggle("finished", id), []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      saved: state.saved,
      finished: state.finished,
      isSaved: (id) => state.saved.includes(id),
      isFinished: (id) => state.finished.includes(id),
      toggleSaved,
      toggleFinished,
      ready,
    }),
    [state, toggleSaved, toggleFinished, ready]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
