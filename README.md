# [AI Safety Resources](https://ai-safety-resources.com)

AI Safety Resources is a community-maintained collection of resources for exploring and enjoying the questions of AI safety and alignment.  
It curates books, papers, films, TV shows, documentaries, podcasts, and websites into browsable categories, with a submission form for new suggestions and guardrails to keep links and metadata reliable.

📚🎬🎧📺📄 For the curious and the deeply engaged

### Mobile app

A React Native (Expo) companion app lives in [`mobile/`](mobile/): browse categories, follow the learning paths with progress tracking, search the full collection, and keep an on-device reading list. See [mobile/README.md](mobile/README.md).

### Deployment

- **Cloudflare Pages:** Connect this repo in [Cloudflare Pages](https://pages.cloudflare.com/) and set build output to `public`. See [docs/cloudflare-pages.md](docs/cloudflare-pages.md).
- **GitHub Pages:** Use **Settings → Pages → Source: "GitHub Actions"**. The workflow deploys the `public/` folder.
- **Netlify:** [![Netlify Status](https://api.netlify.com/api/v1/badges/db1201fd-2948-475e-85e1-efceac89bba5/deploy-status)](https://app.netlify.com/sites/bright-cucurucho-3be4e5/deploys) — publish directory `public`.

### Build pipeline

`public/resources.js` is the canonical, hand-edited source of truth. A small Node build step (no dependencies) derives everything else from it:

```bash
npm run build     # validate + regenerate all derived files
npm run check     # validate only (CI gate), no files written
```

`node scripts/build.mjs` validates every entry against a lightweight schema (required `Name`/`Link`, valid category, sane `Year`/`page_count`, no duplicate link within a track) and then regenerates:

- `data/resources.json` — machine-readable export of the full dataset (with derived `track` and `tags`).
- `data/search-index.json` — lightweight search index.
- `public/resource-tags.js` — derived topic tags (keyed by title) folded into client-side search.
- `public/index.html` — server-rendered resource cards injected into each category pane (for SEO and a no-JS fallback), a category `ItemList` JSON-LD, and the curated **Start here** cards.
- `public/<category>/index.html` — a static, crawlable page per category with its own `ItemList` JSON-LD.
- `public/sitemap.xml` — homepage + one URL per category page.

After editing `public/resources.js`, run `npm run build` and commit the regenerated files. CI (`.github/workflows/build.yml`) runs the build and fails if the committed output is out of sync.

Curated lists live in code: the **Start here** picks and the **topic tag** keyword map are in [`scripts/lib/resources.mjs`](scripts/lib/resources.mjs).

### Add a new resource by editing the [resources.js](public/resources.js) file, running `npm run build`, and submitting a pull request

### Suggestions & contact submissions

Suggestions and contact-form messages post to the first-party endpoint **`POST /api/submit`**
([`functions/api/submit.js`](functions/api/submit.js)), a Cloudflare Pages Function that
emails the submission via [Resend](https://resend.com) — no Google Sheets involved.
Set `RESEND_API_KEY` in Cloudflare Pages (Settings → Environment variables); optional
`CONTACT_EMAIL` overrides the default recipient. The endpoint validates payloads,
caps field lengths, and drops honeypot-flagged spam.

Routing is configured in [`public/suggestion-form-config.js`](public/suggestion-form-config.js):

- `mode: "api"` (default) — POST to `/api/submit`; if the API is unreachable or
  unconfigured, the form falls back to opening the visitor's email client.
- `mode: "email"` — always use the visitor's email client (`mailto:`).
- `mode: "apps_script"` / `mode: "google_form"` — legacy Google-backed modes, still
  supported for alternative deployments ([`docs/google-form-copy.md`](docs/google-form-copy.md)
  has the form template).

The header **Contact** button opens a contact form posting to the same endpoint
(with a `mailto:` fallback for no-JS visitors and non-api deployments).

Keep config changes in git so submission routing is reviewable in pull requests.

### Accounts & cross-device sync (optional)

Reading-list progress is stored in the browser (`localStorage`) by default, so it
can be lost if a visitor clears site data or switches devices. Optional accounts
let visitors back up that progress and sync it across devices via Cloudflare Pages
Functions ([`functions/api/account/`](functions/api/account)) backed by a KV
namespace. It is off until configured and degrades gracefully to local-only mode.
See [docs/accounts.md](docs/accounts.md) for setup.

### Resource guardrails

To prevent a single bad entry from breaking the page and to catch dead links early:

- Runtime guardrails are loaded from [`public/resource-guardrails-config.js`](public/resource-guardrails-config.js).
  - `disabledTitles`: temporarily hide resources by title.
  - `disabledLinks`: temporarily hide resources by URL.
- Link checks can be run locally:

```bash
node scripts/resource-guardrails.mjs
```

- To automatically add hard-broken resources (404/410/451 or bad redirects) to runtime guardrails:

```bash
node scripts/resource-guardrails.mjs --update-config
```

A GitHub Action also runs this checker on PRs and weekly schedules.

### Film posters and titles (OMDB)

Films in `public/resources.js` use the `Name` and `Image` fields for title and poster. To backfill missing posters or refresh all film data from [OMDb](https://www.omdbapi.com/):

1. Get a free API key at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
2. Run:

```bash
OMDB_API_KEY=yourkey node scripts/fetch-film-posters-omdb.mjs
```

This updates only films that are missing an `Image`. To refresh every film’s poster (and fill missing titles) from OMDB:

```bash
OMDB_API_KEY=yourkey node scripts/fetch-film-posters-omdb.mjs --all
```
