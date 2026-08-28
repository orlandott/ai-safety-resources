# The Shared Canon

Source for the "The Shared Canon" artifact — a comparison of which papers and
readings appear across AI safety course syllabi, with a most-assigned
leaderboard and a reading × course matrix.

Published artifact: https://claude.ai/code/artifact/a89bcdd9-e391-4a4a-89cc-94d7035cfbec

## Contents

- `data/*.json` — per-course reading lists extracted from each course's public
  syllabus (snapshots taken 2026-08-21). One file per course; `bluedot-trio.json`
  covers the three BlueDot courses that have no external reading lists, and
  `lens-academy.json` covers all Lens Academy platform courses (the build scopes
  which ones count — see `merge.py`).
- `merge.py` — unifies readings across courses (arXiv ID first, then normalized
  title) into `merged.json`.
- `build_data.py` — produces the compact `payload.json` embedded in the page;
  merges in `citations.json` (approximate Google Scholar counts) when present.
- `page.template.html` — the page itself; `__PAYLOAD__` and `__DATE__` are
  replaced at build time.
- `build.py` — runs the whole pipeline: `python3 build.py`.
- `shared-canon.html` — the built page, as published.

## Courses covered

Nine curricula examined; six have public reading lists and appear in the matrix:
AI Alignment / AGI Safety Fundamentals (BlueDot), Technical AI Safety (BlueDot),
ARENA, Intro to ML Safety (CAIS), AI Safety Ethics & Society (CAIS), and
Lens Academy (first-party AI-safety courses only). The Future of AI, AI Safety
Operations Bootcamp, and the Technical AI Safety Project Sprint (all BlueDot)
have no paper syllabi and sit outside the matrix.

Data caveats live in the page's Methodology section and in each data file's
`notes` field — read those before trusting an edge case.
