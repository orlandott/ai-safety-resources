// Cloudflare Pages Function: GET/POST /api/ratings
// Stores 1-5 star ratings in D1, keyed by (resource_link, user_id). `userId`
// is an anonymous id the client generates and keeps in localStorage — this
// site has no accounts, matching the existing reading-list feature.
import { json, corsPreflight } from "../lib/http.js";
import { isKnownResourceLink } from "../lib/resources.js";

const MAX_USER_ID_LENGTH = 100;

function isValidUserId(userId) {
  return typeof userId === "string" && userId.trim().length > 0 && userId.length <= MAX_USER_ID_LENGTH;
}

export async function onRequestOptions() {
  return corsPreflight();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.RATINGS_DB) {
    return json({ error: "Ratings are not configured on this deployment." }, 503);
  }

  const url = new URL(request.url);
  const userId = (url.searchParams.get("userId") || "").trim();

  try {
    const aggregateRows = await env.RATINGS_DB.prepare(
      "SELECT resource_link, AVG(stars) AS average, COUNT(*) AS count FROM ratings GROUP BY resource_link"
    ).all();

    const ratings = {};
    for (const row of aggregateRows.results || []) {
      ratings[row.resource_link] = {
        average: Math.round(Number(row.average) * 10) / 10,
        count: Number(row.count),
      };
    }

    const body = { ratings };

    if (isValidUserId(userId)) {
      const userRows = await env.RATINGS_DB.prepare(
        "SELECT resource_link, stars FROM ratings WHERE user_id = ?"
      )
        .bind(userId)
        .all();
      const userRatings = {};
      for (const row of userRows.results || []) {
        userRatings[row.resource_link] = row.stars;
      }
      body.userRatings = userRatings;
    }

    return json(body);
  } catch (error) {
    return json({ error: "Failed to load ratings" }, 502);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.RATINGS_DB) {
    return json({ error: "Ratings are not configured on this deployment." }, 503);
  }

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return json({ error: "Content-Type must be application/json" }, 400);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const resourceLink = (data.resourceLink || "").toString().trim();
  const userId = (data.userId || "").toString().trim();
  const stars = Number(data.stars);

  if (!isValidUserId(userId)) {
    return json({ error: "userId is required" }, 400);
  }
  if (!resourceLink || !isKnownResourceLink(resourceLink)) {
    return json({ error: "resourceLink is not a known resource" }, 400);
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return json({ error: "stars must be an integer between 1 and 5" }, 400);
  }

  try {
    const now = new Date().toISOString();
    await env.RATINGS_DB.prepare(
      `INSERT INTO ratings (resource_link, user_id, stars, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(resource_link, user_id)
       DO UPDATE SET stars = excluded.stars, updated_at = excluded.updated_at`
    )
      .bind(resourceLink, userId, stars, now, now)
      .run();

    const aggregate = await env.RATINGS_DB.prepare(
      "SELECT AVG(stars) AS average, COUNT(*) AS count FROM ratings WHERE resource_link = ?"
    )
      .bind(resourceLink)
      .first();

    return json({
      success: true,
      average: Math.round(Number(aggregate.average) * 10) / 10,
      count: Number(aggregate.count),
    });
  } catch (error) {
    return json({ error: "Failed to save rating" }, 502);
  }
}
