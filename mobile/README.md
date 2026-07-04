# AI Safety Resources — Mobile

A React Native (Expo) companion app for [ai-safety-resources.com](https://ai-safety-resources.com): browse, search, and track the site's curated collection of AI safety books, papers, films, TV shows, documentaries, podcasts, courses, and channels — offline, from your pocket.

## Features

- **Explore** — the four curated learning paths ("New to AI safety", "I'm technical", "I'm a policymaker", "I just want stories") plus all ten resource categories.
- **Learning paths with progress** — each path shows the curator's step-by-step ordering and per-step rationale, with a progress bar driven by what you've marked finished.
- **Category browsing** — every category filterable by level (Beginner / Intermediate / Advanced).
- **Search** — full-text over titles, authors, summaries, and topic tags, with an optional category filter.
- **Library** — save resources to a reading/watch list and mark them finished; stored on-device with AsyncStorage, no account needed.
- **Dark mode** — follows the system appearance automatically.
- **Fully offline** — the entire dataset ships in the app bundle; only posters and outbound links need a connection.

## Running the app

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with [Expo Go](https://expo.dev/go) on your phone, or press `i` / `a` to open an iOS simulator / Android emulator.

## Data

The app bundles the repo's canonical dataset. After `public/resources.js` changes upstream (and `npm run build` regenerates `data/resources.json`), refresh the app copy:

```bash
npm run sync-data   # regenerates src/data/app-data.json from ../data and ../scripts/lib
```

`scripts/sync-data.mjs` also resolves the curated learning paths (`PATHS` in `scripts/lib/resources.mjs`) against the dataset and fails loudly if a path step no longer matches a resource. Commit the regenerated `src/data/app-data.json`.

## Structure

```
mobile/
├── App.tsx                  # providers + navigator
├── scripts/sync-data.mjs    # dataset sync from the repo root
└── src/
    ├── data/                # bundled dataset + lookup/search helpers
    ├── navigation/          # root stack + bottom tabs
    ├── screens/             # Home, Category, Path, Search, Saved, ResourceDetail
    ├── components/          # ResourceCard, Chip, LevelBadge, EmptyState
    ├── store/library.tsx    # saved/finished lists persisted with AsyncStorage
    └── theme.ts             # light/dark palette
```

## Releasing

Store builds go through EAS — see [docs/app-store-release.md](../docs/app-store-release.md)
(build, TestFlight, listing copy, review) and [docs/google-play-release.md](../docs/google-play-release.md)
(build, closed testing, data safety, listing copy) for the full walkthroughs.
Icons and Play listing graphics are generated from the site logo with
`node scripts/make-icons.mjs`.

## Checks

```bash
npm run typecheck                # tsc --noEmit
npx expo export --platform ios   # verify the app bundles with Metro
```
