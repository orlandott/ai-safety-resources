// Cloudflare Pages Function: GET /api/recommendations
// Params: resourceLink (seed a single resource), userId (seed from that
// user's highly-rated resources), limit (default 6, max 20).
import { json, corsPreflight } from "../lib/http.js";
import { getAllResources, isKnownResourceLink } from "../lib/resources.js";
import { recommend } from "../lib/recommend.js";

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;
const SEED_MIN_STARS = 4;
const MAX_USER_SEEDS = 5;

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.RATINGS_DB) {
    return json({ error: "Recommendations are not configured on this deployment." }, 503);
  }

  const url = new URL(request.url);
  const resourceLink = (url.searchParams.get("resourceLink") || "").trim();
  const userId = (url.searchParams.get("userId") || "").trim();
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get("limit"), 10) || DEFAULT_LIMIT));

  try {
    const ratingsRows = (
      await env.RATINGS_DB.prepare("SELECT resource_link, user_id, stars FROM ratings").all()
    ).results || [];

    const seedLinks = [];
    const excludeLinks = [];

    if (resourceLink && isKnownResourceLink(resourceLink)) {
      seedLinks.push(resourceLink);
    }

    if (userId) {
      const userRows = ratingsRows.filter((row) => row.user_id === userId);
      userRows.forEach((row) => excludeLinks.push(row.resource_link));
      userRows
        .filter((row) => row.stars >= SEED_MIN_STARS && row.resource_link !== resourceLink)
        .sort((a, b) => b.stars - a.stars)
        .slice(0, MAX_USER_SEEDS)
        .forEach((row) => seedLinks.push(row.resource_link));
    }

    const result = recommend({
      ratingsRows,
      resources: getAllResources(),
      seedLinks,
      excludeLinks,
      limit,
    });

    return json(result);
  } catch (error) {
    return json({ error: "Failed to load recommendations" }, 502);
  }
}
