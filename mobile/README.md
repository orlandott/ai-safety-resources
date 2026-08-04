# AI Safety Resources — Mobile

A React Native (Expo) companion app for [ai-safety-resources.com](https://ai-safety-resources.com): browse, search, and track the site's curated collection of AI safety books, papers, films, TV shows, documentaries, podcasts, courses, and channels — offline, from your pocket.

## Features

The dataset is curated upstream; what the app adds is a record of what *you* did
with it. Everything below is computed on-device — there is no account, no server,
and no network call in any of it.

- **Shelves, ratings, and notes** — every resource sits on one of three shelves
  (to start / in progress / finished), takes a 1–5 star rating, and holds a
  free-text note. Persisted with AsyncStorage; nothing leaves the device.
- **Progress** — a dedicated tab that works out time invested from each
  resource's listed length, category and topic coverage, the beginner /
  intermediate / advanced mix, per-path completion, and how you're tracking
  against a monthly goal you set.
- **Suggestions** — [`src/recommend.ts`](src/recommend.ts) ranks what you haven't
  shelved against a taste profile built from your shelves and ratings: the next
  unfinished step of any path you've started first, then topic and category
  affinity with a level fit, spread across categories so one track can't take
  every slot. An empty library falls back to the curator's opening sequence.
- **Related resources** — each detail screen scores the rest of the collection by
  shared author, topics, category, and level, so a resource is a jumping-off
  point rather than a dead end.
- **Time-budget search** — full-text over titles, authors, summaries, and topic
  tags, filterable by category and by how long you've actually got.
- **Learning paths** — the four curated paths ("New to AI safety", "I'm
  technical", "I'm a policymaker", "I just want stories") with the curator's
  step-by-step ordering, per-step rationale, and a progress bar.
- **Category browsing** — every category filterable by level.
- **Share** — the native share sheet, for passing a resource on.
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
  (selected filter chips, the current shelf, the star you've given). Resource cards
  read as a single element — title, author, level, category, shelf, rating, whether
  you've written a note, and summary — with decorative emoji and poster artwork
  hidden from the screen reader. Learning-path steps announce their position
  ("Step 2 of 8"), progress bars report their value, and the monthly goal is an
  `adjustable` element that responds to VoiceOver's increment/decrement swipes.
  Screen and section titles expose the header trait for rotor navigation.
- **Voice Control** — spoken labels start with each control's visible text
  ("Save", "Beginner", "Open resource"), so voice commands match what's on screen.
- **Larger Text** — text respects Dynamic Type at every size; at accessibility sizes
  (font scale ≥ 1.35) cards relax their line clamps so enlarged text reflows
  instead of truncating, and the three-across shelf picker stacks into rows
  (`useLargeTextMode` in [`src/a11y.ts`](src/a11y.ts)).
- **Dark Interface** — follows the system appearance automatically.
- **Differentiate Without Color Alone** — state is never color-only: selected chips
  fill and announce "selected", the shelf picker changes its label and symbol, star
  ratings are spoken as "Rated 4 out of 5", and every progress bar shows a "3/8"
  count beside it.
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
├── scripts/
│   ├── sync-data.mjs        # dataset sync from the repo root
│   ├── make-icons.mjs       # draws the app mark and every icon size from it
│   └── screenshots.mjs      # store screenshots, driven through the web build
└── src/
    ├── data/                # bundled dataset + lookup/search/duration helpers
    ├── navigation/          # root stack + bottom tabs
    ├── screens/             # Home, Category, Path, Search, Library, Progress, ResourceDetail
    ├── components/          # ResourceCard, ShelfPicker, StarRating, ProgressBar, Chip, LevelBadge, EmptyState
    ├── store/library.tsx    # shelves, ratings, notes, and the goal, in AsyncStorage
    ├── recommend.ts         # on-device suggestions and related-resource scoring
    ├── stats.ts             # everything the Progress screen displays
    ├── a11y.ts              # system accessibility-setting hooks
    └── theme.ts             # light/dark palette (+ high-contrast variants)
```

## Releasing

Store builds go through EAS — see [docs/app-store-release.md](../docs/app-store-release.md)
(build, TestFlight, listing copy, review) and [docs/google-play-release.md](../docs/google-play-release.md)
(build, closed testing, data safety, listing copy) for the full walkthroughs.
Icons and Play listing graphics are generated with `node scripts/make-icons.mjs`,
which draws the app's shield-and-book mark as vectors and renders every size from
it: the iOS universal icon plus the iOS 18 dark and tinted variants, the Android
adaptive foreground / background / monochrome set, the splash icon, the web
favicon, the in-app header logo, and the Play Store icon and feature graphic.
Editing the mark means editing the paths at the top of that script and re-running
it — the outputs are committed, not built at release time.

A shareable preview — the whole app as one self-contained HTML file, for
showing someone the build before a native one exists — comes from `npm run preview`.
It inlines the JS bundle, the navigation icons, and (best effort) the cover art, so
the page needs no network at all. It also fills two gaps the app doesn't have on
device: a `matchMedia` shim so the page follows a host theme toggle as well as the
OS setting, and a device frame on pointer-fine viewports so a phone layout isn't
stretched across a desktop window.

Store screenshots are generated from the web build with `npm run screenshots`
(App Store 6.9"/6.5" and Play Store 9:16, at exact pixel sizes) into
`assets/app-store/` and `assets/play-store/screenshots/`. Cover art loads over
the network, so run it somewhere the poster hosts are reachable; otherwise the
app's typographic covers stand in. The script seeds a half-finished library into
`localStorage` first, so the shelves, ratings, notes, and Progress stats have
something real to show.

## Checks

```bash
npm run typecheck                # tsc --noEmit
npx expo export --platform ios   # verify the app bundles with Metro
```
