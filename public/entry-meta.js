// Shared metadata helpers: difficulty level + "time to consume" labels.
//
// This is the single source of truth for the card metadata pills, consumed by
// BOTH sides of the site so they can never drift apart:
//   • the build — scripts/lib/resources.mjs evaluates this file in a vm
//     sandbox (the same way it loads resources.js) and re-exports these
//     functions for the server-rendered cards and data exports;
//   • the runtime — index.html loads this file as a classic script before
//     script.js, which reads window.ENTRY_META for the hydrated cards.
//
// Because it runs in a browser and in a bare vm context, this file must stay
// dependency-free and must not touch the DOM or any Node API. Its only side
// effect is defining window.ENTRY_META.
//
// Level is a per-track default that authors can override per entry with a
// `Level` field. The defaults encode the obvious on-ramp: stories and video
// are accessible, papers are the deep end.
//
// Time labels: books/papers derive from `page_count` (~1.8 min/page);
// audio-visual tracks derive from an optional `Minutes`. Series set
// `MinutesPer` ("episode" | "video") so `Minutes` reads as a typical
// installment length rather than a total. Courses use `Minutes` as a
// total-effort estimate. Returns "" when there is nothing to estimate, so
// callers can omit the pill rather than guess.
window.ENTRY_META = (() => {
  const VALID_LEVELS = ["Beginner", "Intermediate", "Advanced"];

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

  const READING_MINUTES_PER_PAGE = 1.8;

  function levelFor(entry = {}, track) {
    if (typeof entry.Level === "string" && VALID_LEVELS.includes(entry.Level)) {
      return entry.Level;
    }
    return LEVEL_BY_TRACK[track] || "";
  }

  function humanizeMinutes(minutes, verb) {
    if (!Number.isFinite(minutes) || minutes <= 0) return "";
    if (minutes < 90) return `~${Math.round(minutes / 5) * 5 || 5} min ${verb}`;
    const hours = minutes / 60;
    const rounded = hours < 10 ? Math.round(hours * 2) / 2 : Math.round(hours);
    return `~${rounded} hr ${verb}`;
  }

  function timeLabelFor(entry = {}, track) {
    const pages = Number(entry.page_count);
    if (Number.isFinite(pages) && pages > 0) {
      return humanizeMinutes(pages * READING_MINUTES_PER_PAGE, "read");
    }
    const minutes = Number(entry.Minutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      if (typeof entry.MinutesPer === "string" && entry.MinutesPer.trim()) {
        return humanizeMinutes(minutes, `per ${entry.MinutesPer.trim()}`);
      }
      if (track === "courses") {
        return humanizeMinutes(minutes, "course");
      }
      const verb = track === "podcasts" ? "listen" : "watch";
      return humanizeMinutes(minutes, verb);
    }
    return "";
  }

  return { VALID_LEVELS, LEVEL_BY_TRACK, levelFor, humanizeMinutes, timeLabelFor };
})();
