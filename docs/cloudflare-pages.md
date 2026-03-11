# Deploy to Cloudflare Pages

This project can be deployed to [Cloudflare Pages](https://pages.cloudflare.com/) with no build step (static site).

## One-time setup

1. **Log in:** [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. **Create project:** **Create** → **Pages** → **Connect to Git**.
3. **Connect repo:** Choose **GitHub** and authorize, then select **`orlandott/ai-safety-resources`** (this repo).
4. **Build settings (important):**
   - **Production branch:** `main` (or your default branch).
   - **Build command:** leave **empty**. Do not set `npx wrangler deploy` (that is for Workers and will fail).
   - **Build output directory:** `public`.
5. **Save and deploy.** Cloudflare will serve the contents of `public/` as the site and run any **Pages Functions** in the repo’s `/functions` directory (e.g. `/api/health`). No build step is required.

Your site will be available at `https://<project-name>.pages.dev`. You can add a custom domain (e.g. readingwhatwecan.com) under the project’s **Custom domains**.

## Dynamic routes (Pages Functions)

The repo includes a `/functions` directory so the project is not purely static:

- **GET /api/health** – returns JSON `{ ok, time, service }` (server-side).
- **POST /api/submit** – accepts the suggestion form payload (JSON or `application/x-www-form-urlencoded`), validates it, and forwards to the Apps Script endpoint. The site’s suggestion form is configured to use this by default (`suggestion-form-config.js` → `endpointUrl: "/api/submit"`). Optional env var `APPS_SCRIPT_ENDPOINT_URL` overrides the forwarding target.

Add more files under `functions/` for extra routes; see [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/).

## Deploy from the CLI

With [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed:

```bash
npx wrangler pages deploy public --project-name=ai-safety-resources
```

## Pushes not triggering a deploy?

If you push to **main** but the site doesn’t update:

1. **Correct repo:** In Cloudflare → your project → **Settings** → **Builds & deployments** → **Build configuration**. Under **Source**, the connected repository must be **orlandott/ai-safety-resources**. If it shows **orlandott/readingwhatwecan**, that’s why: Cloudflare is watching the wrong repo. Disconnect and **Connect to Git** again, then choose **orlandott/ai-safety-resources** and branch **main**.
2. **GitHub app access:** Go to [github.com/settings/installations](https://github.com/settings/installations) → **Cloudflare Pages** → **Configure**. Under **Repository access**, ensure **orlandott/ai-safety-resources** is selected (or “All repositories”).
3. **Production branch:** In the same Build configuration, **Production branch** should be **main**.
4. **Manual deploy:** In Cloudflare → **Deployments** → **Create deployment** (or **Retry** on the latest) to confirm the project builds; then fix the connection so future pushes trigger automatically.

## After migrating from Netlify / GitHub Pages

- In **Netlify:** you can delete the site or leave it disabled.
- In **GitHub:** under **Settings → Pages**, you can set Source to something other than GitHub Actions if you no longer need the `*.github.io` deployment.
- **Custom domain:** point the DNS for your domain to Cloudflare (or add a CNAME to the Pages URL) and add the domain in the Pages project’s **Custom domains**.
