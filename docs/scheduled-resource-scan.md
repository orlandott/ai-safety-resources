# Scheduled resource scan

A scheduled Claude Code task (a "routine") runs twice a month — on the **1st and
16th** (~every 15 days) — to scan the web for new AI safety resources and add
them to the collection. Each run works in a fresh session, follows the process
below, and opens a pull request with its additions so a human reviews before
anything goes live.

This file is the canonical, editable description of that process. The routine
reads it at the start of every run, so changing this file changes what the
routine does — no need to touch the schedule itself.

## Process

1. **Dedupe against the collection.** `public/resources.js` is the hand-edited
   source of truth. A candidate is a duplicate if its `Link` or `Name` already
   appears (fuzzy match — the same paper on arXiv vs. a mirror is a duplicate;
   a retitled re-release of a film is a duplicate).
2. **Scan for candidates** with web search, covering every category:
   - `academic_papers` — new alignment/safety papers (arXiv, Alignment Forum
     highlights, lab publications).
   - `books` — newly published fiction and non-fiction with substantial
     AI-safety/alignment relevance.
   - `films`, `tv`, `documentaries` — new releases with substantial AI-risk or
     machine-agency themes (not incidental robot cameos).
   - `podcasts` — new *shows* (the collection lists shows, not episodes).
   - `websites` — notable new orgs, reports, essays, or interactive resources.
   - `youtube` — new channels, lectures, or standout videos.
   - `courses` — new structured courses or curricula.

   Prioritize items from the last few months, but notable older items missing
   from the collection are also fair game.
3. **Be selective.** Quality over quantity: roughly 3–10 additions per run.
   Every addition must be clearly on-topic and reputable. If nothing clears the
   bar, add nothing — an empty run is a valid outcome.
4. **Fill every field the category uses**, matching the style of neighboring
   entries in `public/resources.js` exactly. Verify every value (year, page
   count, runtime, ratings) against real sources — never guess a rating.

   | Category | Required fields | Notes |
   |---|---|---|
   | `academic_papers` | `Name`, `Author`, `Link`, `page_count`, `Year`, `Summary` | `Link` to the paper (arXiv abstract page preferred). |
   | `books` | `Name`, `Author`, `Link`, `page_count`, `Year`, `Summary`, `goodreads` | `Link` is a Goodreads search URL (`https://www.goodreads.com/search?q=Title+Author`); `goodreads` is the rating as a string, e.g. `"4.15"`. |
   | `courses` | `Name`, `Author`, `Link`, `Minutes`, `Summary`, `Level` | `Minutes` is total course length. |
   | `films` | `Name`, `Author`, `Link`, `Year`, `Minutes`, `Summary`, `imdb`, `rt`, `Image` | `Author` is the director; `Link` is the IMDb title page; `imdb` is a string (`"8.3"`), `rt` an integer (`98`); `Image` is a poster URL (Wikimedia preferred). |
   | `tv` | `Name`, `Author`, `Link`, `Year`, `Minutes`, `MinutesPer`, `Summary`, `imdb`, `rt` (when available) | `Author` is the creator; `Minutes` is per-episode runtime with `MinutesPer: "episode"`. |
   | `documentaries` | `Name`, `Author`, `Link`, `Year`, `Minutes`, `Summary`, `imdb`, plus `rt` and `Wikipedia` when available | `Wikipedia` is the article *title*, not a URL. |
   | `podcasts` | `Name`, `Author`, `Link`, `Year`, `Minutes`, `MinutesPer`, `Level`, `Summary` | `Author` is the host; `Year` is when the show started; `Minutes` is typical episode length with `MinutesPer: "episode"`. |
   | `websites` | `Name`, `Author`, `Link`, `page_count`, `Level`, `Summary` | `Author` is the org or author; `page_count` approximates reading length. |
   | `youtube` | `Name`, `Author`, `Link`, `Year`, `Minutes`, `Summary` | Channels also take `MinutesPer: "video"` with typical video length in `Minutes`. |

   Shared conventions:
   - `Summary` — one sentence in the site's editorial voice: what it is and why
     it matters for AI safety. Read a few existing summaries first and match tone.
   - `Level` — optional on most categories; one of `Beginner`, `Intermediate`,
     `Advanced` (see `VALID_LEVELS` in `scripts/lib/resources.mjs`).
   - Topic tags are **auto-derived** from keywords (see `TOPIC_TAGS` in
     `scripts/lib/resources.mjs`). Only set `IncludeTopics` / `ExcludeTopics`
     (arrays of valid tag ids) when the automatic derivation is wrong.
5. **Fiction books** additionally require adding the exact title to the
   `fictionBookTitles` Set in `public/script.js` — that list is what splits the
   `books` category into fiction and non-fiction tracks.
6. **Verify every new link resolves** (follow redirects, confirm it lands on
   the intended page) before adding it.
7. **Build and validate.** Run `npm run build` — it validates the schema and
   regenerates the derived files (`data/resources.json`,
   `data/search-index.json`, `public/resource-tags.js`, static category pages,
   `public/sitemap.xml`). Fix any validation errors and commit the regenerated
   files together with the source edits. Then run
   `node scripts/resource-guardrails.mjs` and confirm no new link is flagged.
8. **Open a pull request.** Commit on a fresh branch named
   `claude/resource-scan-YYYY-MM-DD` (run date), push it, and open a PR against
   the default branch titled `Scheduled scan: add N new AI safety resources`.
   The PR body lists each addition with its link and a one-line rationale.
   If there were no additions, push nothing and open no PR.

## Adjusting or stopping the scan

The schedule lives in a Claude Code routine (scheduled trigger), not in this
repository. Ask Claude Code to list, update, or delete the trigger, or manage
it from the Claude Code web UI. Deleting this file does not stop the schedule —
the routine's built-in instructions cover the same process.
