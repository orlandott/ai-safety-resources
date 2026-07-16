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
  accounts, analytics, or tracking; saved/finished lists stay on-device.
- **Promotional text** (170 chars max, optional, editable without a new review):

  > Explore 300+ curated AI safety books, papers, films, podcasts, and courses,
  > with guided learning paths, offline search, and progress tracking. No
  > account needed.

- **Description**:

  > Explore the ideas shaping AI safety and alignment through the books,
  > papers, films, TV shows, documentaries, podcasts, courses, and channels
  > that explain them best.
  >
  > AI Safety Resources is the mobile companion to ai-safety-resources.com, a
  > community-curated library of 300+ resources:
  >
  > • Four guided learning paths (for newcomers, technical readers,
  > policymakers, and anyone who just wants great stories) with step-by-step
  > ordering, the reasoning behind every pick, and progress tracking.
  > • Ten browsable categories with difficulty levels from beginner to advanced.
  > • Full-text search across titles, authors, summaries, and topics.
  > • A personal library: save resources for later and mark them finished. All
  > of it stays on your device, no account required.
  > • Works offline; the entire catalog ships with the app.
  > • Light and dark mode, following your system setting.
  >
  > For the curious and the deeply engaged.

- **Keywords** (100 chars max):
  `AI safety,alignment,artificial intelligence,AGI,machine learning,ethics,books,reading list,papers`

- **Screenshots**: required for 6.9" (iPhone 16 Pro Max class) and 6.5"
  displays. Run the app in those simulators (`npx expo start --ios`) or on
  device and capture: Home (paths + categories), a learning path with progress,
  a category list, a resource detail, and search. No frames or captions needed.

## 6. Submit for review

Add the build to the version, answer export compliance (already declared in
`app.json`: no non-exempt encryption), and Submit. Review typically takes 1–2
days. Rejections, if any, usually come with a specific reason — fix and resubmit.

## Updating the app later

- Bump `version` in `mobile/app.json` (e.g. `1.1.0`) for store releases; the
  production profile auto-increments the build number.
- Dataset refresh after the site's `npm run build`: `cd mobile && npm run sync-data`,
  commit, rebuild, `eas build` + `eas submit` again.

## Android

The Google Play release has its own walkthrough: [google-play-release.md](google-play-release.md).
