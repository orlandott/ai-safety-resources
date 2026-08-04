# Releasing the mobile app to the App Store

One-time walkthrough from a fresh checkout to a public App Store listing.
Prerequisites: an [Apple Developer Program](https://developer.apple.com/programs/)
membership ($99/year, approved) and a free [Expo account](https://expo.dev).

## 1. Link the project to EAS (once)

```bash
cd mobile
npm install
npx eas-cli login       # your expo.dev credentials
npx eas-cli init        # creates the EAS project and writes projectId into app.json
```

Commit the `extra.eas.projectId` that `eas init` adds to `app.json`.

## 2. Build for iOS

```bash
npx eas-cli build --platform ios --profile production
```

On the first run EAS asks you to sign in with your Apple ID and then creates the
signing certificate and provisioning profile for you, and registers the bundle ID
`com.orlandott.aisafetyresources` on your developer account. The build runs on
Expo's servers (~10–20 min); no Mac needed.

## 3. Create the app record & submit the build

In [App Store Connect](https://appstoreconnect.apple.com) → My Apps → **+** → New App:

- Platform: iOS · Name: **AI Safety Resources** · Language: English
- Bundle ID: `com.orlandott.aisafetyresources` · SKU: `ai-safety-resources`

Then upload the build:

```bash
npx eas-cli submit --platform ios --latest
```

## 4. TestFlight sanity check (recommended)

App Store Connect → TestFlight → add yourself as an internal tester, install via
the TestFlight app, and click through the app once on a real device before
submitting for review.

## 5. Fill in the listing

Ready-to-paste copy — edit freely:

- **Subtitle** (30 chars max): `Curated AI safety library`
- **Category**: Education (secondary: Books)
- **Privacy Policy URL**: `https://ai-safety-resources.com/privacy/`
  (page lives in `public/privacy/index.html`; deploys with the site)
- **Age rating**: answer the questionnaire — nothing applies; results in 4+.
- **App Privacy** section: select **"Data is not collected"** — the app has no
  accounts, analytics, or tracking; shelves, ratings, and notes stay on-device.
- **Description**:

  > Explore the ideas shaping AI safety and alignment — through the books,
  > papers, films, TV shows, documentaries, podcasts, courses, and channels
  > that explain them best.
  >
  > AI Safety Resources is a reading tracker built around a community-curated
  > library of 300+ resources, all of it shipped inside the app:
  >
  > • Three shelves — to start, in progress, finished — with your own 1–5 star
  > ratings and private notes on anything you've read or watched.
  > • A Progress tab that works out, on your device, how much time you've put
  > in, which topics and categories you've covered, and how far through each
  > learning path you are — against a monthly goal you set.
  > • Suggestions computed from your own shelves: what comes next in a path
  > you've started, and more on the topics you keep returning to.
  > • Four guided learning paths — whether you're completely new, technical, a
  > policymaker, or just want great stories — with step-by-step ordering and
  > the reasoning behind every pick.
  > • Ten browsable categories with difficulty levels from beginner to advanced.
  > • Search across titles, authors, summaries, and topics, with a time filter
  > for when you only have twenty minutes.
  > • Works offline; the entire catalog ships with the app, and your shelves,
  > ratings, and notes never leave your device. No account required.
  > • Light and dark mode, following your system setting.
  >
  > For the curious and the deeply engaged.

- **Keywords** (100 chars max):
  `AI safety,alignment,artificial intelligence,AGI,machine learning,ethics,books,reading list,papers`

- **Screenshots**: required for 6.9" (iPhone 16 Pro Max class) and 6.5"
  displays. Generate them from the web build with `cd mobile && npm run screenshots`
  (needs outbound access to the cover-art hosts — see below); the exact-size PNGs
  land in `mobile/assets/app-store/iphone-6.9/` (1290×2796) and
  `mobile/assets/app-store/iphone-6.5/` (1242×2688). Each set is Explore with its
  on-device suggestions, a learning path with progress, the library's finished
  shelf with ratings and notes, the Progress tab, a resource detail showing the
  shelf / rating / notes controls, search with the time filter, a category list,
  plus a dark-mode shot. Lead with Progress and the detail screen — they're what
  show the app does something a web page doesn't. No frames or captions needed.
  To capture on a real simulator instead, run `npx expo start --ios` and
  screenshot the same screens.
  Cover art loads over the network; `npm run screenshots` needs those hosts
  reachable (`upload.wikimedia.org`, `m.media-amazon.com`,
  `images-na.ssl-images-amazon.com`, `covers.openlibrary.org`, `i.gr-assets.com`,
  `books.google.com`) or posters fall back to the app's typographic covers.

## 6. Submit for review

Add the build to the version, answer export compliance (already declared in
`app.json`: no non-exempt encryption), and Submit. Review typically takes 1–2
days. Rejections, if any, usually come with a specific reason — fix and resubmit.

## If review rejects the submission

Version 1.0 was rejected on two guidelines; both are fixed in the tree, and the
notes below are what to say when resubmitting.

**2.3.8 — Accurate Metadata (placeholder icons).** The 1.0 icons put the site's
677x250 landscape emblem on a cream square, so roughly three quarters of the
canvas was empty and the illustration's line detail turned to mud at the ~40pt an
icon actually renders at — which is what reads as unfinished art.
`mobile/scripts/make-icons.mjs` now draws the same robot as a flat mark built
from rounded rectangles — same face, same cyan eyes, same gold crest — and
renders every icon the app ships from it: the iOS universal icon plus the iOS 18
dark and tinted variants, the Android adaptive foreground / background /
monochrome set, the web favicon, the Play 512 icon and feature graphic, and the
in-app header logo. One mark on one green ground at every size, legible down to
29px, so the app is recognisable in Spotlight and on the home screen. Re-run
`node scripts/make-icons.mjs` after any change to the mark.

**4.2.2 — Minimum Functionality (links aggregated from the web).** The app was a
browsable catalogue with an outbound link on each entry. It now keeps a reading
record: three shelves, 1–5 star ratings, and free-text notes per resource; a
Progress tab that computes time invested, category and topic coverage, level
mix, and per-path completion against a monthly goal; suggestions ranked on
device from the user's own shelves and ratings; a time-budget filter over the
listed run times; and a native share sheet. None of it needs a network — the
dataset ships in the bundle and every calculation runs locally, which is the
argument to make in the reply: the app is a tracker over an offline library, not
a wrapper around a website.

Point the reviewer at the Progress tab and at any resource's detail screen.

## Updating the app later

- Bump `version` in `mobile/app.json` (e.g. `1.1.0`) for store releases; the
  production profile auto-increments the build number.
- Dataset refresh after the site's `npm run build`: `cd mobile && npm run sync-data`,
  commit, rebuild, `eas build` + `eas submit` again.

## Android

The Google Play release has its own walkthrough: [google-play-release.md](google-play-release.md).
