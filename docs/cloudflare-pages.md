# Deploy to Cloudflare Pages

This project can be deployed to [Cloudflare Pages](https://pages.cloudflare.com/) with no build step (static site).

## One-time setup

1. **Log in:** [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. **Create project:** **Create** → **Pages** → **Connect to Git**.
3. **Connect repo:** Choose **GitHub** and authorize, then select `orlandott/readingwhatwecan` (or your fork).
4. **Build settings:**
   - **Production branch:** `main` (or your default branch).
   - **Build command:** leave empty.
   - **Build output directory:** `public`.
5. **Save and deploy.** Cloudflare will use the repo’s `wrangler.toml` if present; the key setting is `pages_build_output_dir = "public"`.

Your site will be available at `https://<project-name>.pages.dev`. You can add a custom domain (e.g. readingwhatwecan.com) under the project’s **Custom domains**.

## Deploy from the CLI

With [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed:

```bash
npx wrangler pages deploy public --project-name=readingwhatwecan
```

## After migrating from Netlify / GitHub Pages

- In **Netlify:** you can delete the site or leave it disabled.
- In **GitHub:** under **Settings → Pages**, you can set Source to something other than GitHub Actions if you no longer need the `*.github.io` deployment.
- **Custom domain:** point the DNS for your domain to Cloudflare (or add a CNAME to the Pages URL) and add the domain in the Pages project’s **Custom domains**.
