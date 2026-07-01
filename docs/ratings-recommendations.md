# Ratings & recommendations

Each resource card has a 1–5 star widget. Rating things feeds a "Recommended
for you" panel in the sidebar that suggests other resources you might like.

## Where ratings live

The site has no accounts. Each browser generates a random id (`crypto.randomUUID()`,
stored in `localStorage` as `rwwc-user-id-v1`) the same way the existing
reading-list feature works — see `getUserId()` in `public/script.js`. Ratings
are stored server-side in Cloudflare D1, keyed by `(resource_link, user_id)`
(`migrations/0001_ratings.sql`). `resource_link` is the resource's `Link`
field from `data/resources.json` — already unique per track (the build
validates no duplicate link within a track), so it doubles as a stable
resource id without adding a new field to the dataset.

## One-time setup (Cloudflare Pages)

```bash
npx wrangler d1 create ai-safety-ratings
# copy the printed database_id into wrangler.toml's [[d1_databases]] block
npx wrangler d1 execute ai-safety-ratings --remote --file=migrations/0001_ratings.sql
```

For local development:

```bash
npx wrangler d1 execute ai-safety-ratings --local --file=migrations/0001_ratings.sql
npx wrangler pages dev public
```

If `RATINGS_DB` isn't bound (no D1 configured, or a deployment target that
doesn't run Cloudflare Pages Functions at all — GitHub Pages, Netlify),
`/api/ratings` and `/api/recommendations` return `503`/404. The frontend
treats that as "no backend" and falls back to a fully client-side experience:
ratings persist in `localStorage` only, and recommendations come from a
content-based algorithm computed from the resources already loaded on the
page (see `computeClientRecommendations` in `public/script.js`). Rating still
works everywhere; only the cross-visitor average and collaborative
recommendations need the D1-backed deployment.

## API

- `POST /api/ratings` — `{ resourceLink, userId, stars }` (1–5), upserts.
- `GET /api/ratings?userId=` — `{ ratings: { <link>: {average, count} }, userRatings: { <link>: stars } }`, one bulk call the frontend uses to paint every card's average/your-rating on load.
- `GET /api/recommendations?resourceLink=&userId=&limit=` — `{ recommendations: [{ name, author, link, category, summary, year, reason }] }`.

## The recommendation algorithm, and the cold-start problem

The brief asked for "SVD or whatever" and specifically to look into what
happens when the ratings matrix is mostly empty — which it will be, for a
long time, on a resource-curation site that just added ratings.

**Why not SVD.** Matrix factorization (SVD-style) needs a reasonably dense
matrix to factor into meaningful latent vectors; with only a few hundred
resources and, initially, single-digit ratings, an iterative SVD/ALS solve
would be numerically unstable, expensive to justify on every request, and
memory/CPU spent on infrastructure a Cloudflare Pages Function's short
execution budget doesn't need. **Item-based collaborative filtering**
(`functions/lib/recommend.js`) is the standard lighter-weight alternative for
this scale: for a seed resource, find other resources whose rating pattern
correlates with it across the users who rated both (adjusted cosine
similarity, mean-centered per user so generous and stingy raters compare
fairly). It's O(ratings × resources) instead of an iterative factorization,
trivial to reason about, and — importantly — it naturally goes quiet instead
of returning noise when there isn't enough data (a pair needs at least 2
common raters to produce a similarity score at all).

**The cold-start fallback chain.** Because CF is silent when the matrix is
sparse, `recommend()` runs it as the first of four tiers, each filling
whatever slots the previous tier left empty:

1. **Collaborative** — item-item similarity, only when ≥2 users rated both the seed and the candidate.
2. **Content-based** — shared tags, category, or author with the seed resource(s). This needs zero ratings at all; it's driven entirely by the existing `tags`/`Category`/`Author` metadata in `data/resources.json`. This is what fires for a brand-new resource, or a new visitor's first rating.
3. **Popularity** — highest sitewide average rating, once *any* ratings exist anywhere, even with zero overlap with the seed.
4. **Diverse** — a deterministic round-robin of one resource per track (books, papers, films, …) by recency. The only tier that works with a completely empty ratings table, so the panel is never blank on day one.

This hybrid/switching approach — falling back to content-based and then
popularity-based recommendations until collaborative signal accumulates — is
the standard answer to the recommender cold-start problem, and it's why
`reason` is included on every returned item (`collaborative` / `content` /
`popularity` / `diverse`): it's plainly visible which tier produced each
pick, both for the UI copy and for debugging.
