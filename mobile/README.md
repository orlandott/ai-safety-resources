# AI Safety Resources — Mobile

A React Native (Expo) companion app for [ai-safety-resources.com](https://ai-safety-resources.com): browse, search, and track the site's curated collection of AI safety books, papers, films, TV shows, documentaries, podcasts, courses, and channels — offline, from your pocket.

## Features

- **Explore** — the four curated learning paths ("New to AI safety", "I'm technical", "I'm a policymaker", "I just want stories") plus all ten resource categories.
- **Learning paths with progress** — each path shows the curator's step-by-step ordering and per-step rationale, with a progress bar driven by what you've marked finished.
- **Category browsing** — every category filterable by level (Beginner / Intermediate / Advanced).
- **Search** — full-text over titles, authors, summaries, and topic tags, with an optional category filter.
- **Library** — save resources to a reading/watch list and mark them finished; stored on-device with AsyncStorage, no account needed.
- **Dark mode** — follows the system appearance automatically.
- **Accessible** — VoiceOver/TalkBack support throughout, Dynamic Type, iPhone and iPad in any orientation. See [Accessibility](#accessibility).
- **Fully offline** — the entire dataset ships in the app bundle; only posters and outbound links need a connection.

## Accessibility

The app is built to work with the platform assistive technologies on iPhone and iPad
(and their Android equivalents):

- **VoiceOver / TalkBack** — every interactive element carries a role
  (button, link, tab, search field, progress bar), a spoken label, and state
  (selected filter chips, saved/finished toggles). Resource cards read as a single
  element — title, author, level, category, saved/finished status, and summary —
  with decorative emoji and poster artwork hidden from the screen reader. Learning-path
  steps announce their position ("Step 2 of 8") and the progress bar reports its value.
- **Headings** — screen and section titles expose the header trait, so VoiceOver users
  can jump between sections with the rotor.
- **Dynamic Type** — text respects the system font-size setting; layouts use flexible
  spacing so enlarged text reflows instead of clipping.
- **Touch targets** — small controls (filter chips, save/finish buttons) meet the
  ~44 pt minimum via `hitSlop` and minimum heights.
- **Smart Invert** — poster artwork is excluded from color inversion
  (`accessibilityIgnoresInvertColors`).
- **iPad & orientation** — `supportsTablet` is enabled and orientation is unlocked
  (WCAG 1.3.4), so the app rotates freely and supports iPad multitasking/Split View.
- **Dark mode & contrast** — both palettes keep body text at ≥ 4.5:1 against their
  backgrounds.

When adding UI, keep this bar: label anything interactive, hide decorative emoji from
screen readers (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`),
and avoid fixed heights around text.

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
