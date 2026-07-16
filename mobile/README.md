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
(and their Android equivalents). Adaptations are driven by the system accessibility
settings, so nothing changes for users who don't opt in. Against the App Store
accessibility-features list:

- **VoiceOver** (and TalkBack) — every interactive element carries a role
  (button, link, tab, search field, progress bar), a spoken label, and state
  (selected filter chips, saved/finished toggles). Resource cards read as a single
  element — title, author, level, category, saved/finished status, and summary —
  with decorative emoji and poster artwork hidden from the screen reader. Learning-path
  steps announce their position ("Step 2 of 8") and the progress bar reports its value.
  Screen and section titles expose the header trait for rotor navigation.
- **Voice Control** — spoken labels start with each control's visible text
  ("Save", "Beginner", "Open resource"), so voice commands match what's on screen.
- **Larger Text** — text respects Dynamic Type at every size; at accessibility sizes
  (font scale ≥ 1.35) cards also relax their line clamps so enlarged text reflows
  instead of truncating (`useLargeTextMode` in [`src/a11y.ts`](src/a11y.ts)).
- **Dark Interface** — follows the system appearance automatically.
- **Differentiate Without Color Alone** — state is never color-only: selected chips
  fill and announce "selected", saved/finished changes the label text and symbol, and
  path progress shows a "3/8 done" count beside the bar.
- **Sufficient Contrast** — both palettes keep text at ≥ 4.5:1 (WCAG AA). When iOS
  **Increase Contrast** (or Android **High contrast text**) is on, the theme switches
  to high-contrast variants with text at ≥ 7:1 and borders at ≥ 3:1
  (`useIncreaseContrast` in [`src/a11y.ts`](src/a11y.ts) + `theme.ts`).
- **Reduced Motion** — with the system setting on, stack navigation swaps its slide
  transition for a cross-fade (`useReduceMotion`); the app has no other animation.
- **Captions / Audio Descriptions** — not applicable: the app plays no audio or video.

Also: small controls meet the ~44 pt touch-target minimum via `hitSlop` and minimum
heights; poster artwork is excluded from Smart Invert (`accessibilityIgnoresInvertColors`);
`supportsTablet` is enabled and orientation is unlocked (WCAG 1.3.4), so the app rotates
freely and supports iPad multitasking/Split View.

When adding UI, keep this bar: label anything interactive, hide decorative emoji from
screen readers (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`),
avoid fixed heights around text, and gate any adaptation on the system setting so the
default experience stays untouched.

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
    ├── a11y.ts              # system accessibility-setting hooks
    └── theme.ts             # light/dark palette (+ high-contrast variants)
```

## Releasing

Store builds go through EAS — see [docs/app-store-release.md](../docs/app-store-release.md)
(build, TestFlight, listing copy, review) and [docs/google-play-release.md](../docs/google-play-release.md)
(build, closed testing, data safety, listing copy) for the full walkthroughs.
Icons and Play listing graphics are generated from the site logo with
`node scripts/make-icons.mjs`.

Store screenshots are generated from the web build with `npm run screenshots`
(App Store 6.9"/6.5" and Play Store 9:16, at exact pixel sizes) into
`assets/app-store/` and `assets/play-store/screenshots/`. Cover art loads over
the network, so run it somewhere the poster hosts are reachable; otherwise the
app's typographic covers stand in.

## Checks

```bash
npm run typecheck                # tsc --noEmit
npx expo export --platform ios   # verify the app bundles with Metro
```
