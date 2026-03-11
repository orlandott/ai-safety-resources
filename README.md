# [Reading What We Can](https://readingwhatwecan.com)

Reading What We Can is a community-maintained reading hub focused on AI safety and alignment.  
It curates books, essays, papers, and speculative fiction into learning tracks, with a submission form for new suggestions and guardrails to keep links and metadata reliable.

📚📚📚📚📚📚📚📚📚 Reading everything

### Deployment

- **Cloudflare Pages:** Connect this repo in [Cloudflare Pages](https://pages.cloudflare.com/) and set build output to `public`. See [docs/cloudflare-pages.md](docs/cloudflare-pages.md).
- **GitHub Pages:** Use **Settings → Pages → Source: "GitHub Actions"**. The workflow deploys the `public/` folder.
- **Netlify:** [![Netlify Status](https://api.netlify.com/api/v1/badges/db1201fd-2948-475e-85e1-efceac89bba5/deploy-status)](https://app.netlify.com/sites/bright-cucurucho-3be4e5/deploys) — publish directory `public`.

### Add a new book by editing the [books.js](public/books.js) file and submitting a pull request

### Suggestions submission endpoint

Suggestions are submitted from the website based on the config in [`public/suggestion-form-config.js`](public/suggestion-form-config.js).

- Current default mode is an Apps Script web app endpoint writing to a Google Sheet.
- If you use Apps Script, deploy it with public access ("Anyone") so website visitors can submit.
- You can also switch to Google Form mode using `formResponseUrl` + `entry.*` mappings.
- Use [`docs/google-form-copy.md`](docs/google-form-copy.md) as the canonical Google Form copy template.

Keep config changes in git so submission routing is reviewable in pull requests.

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
