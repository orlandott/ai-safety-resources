// GET  /api/account/reading-list → returns the signed-in user's synced progress.
// PUT  /api/account/reading-list { readingList } → replaces it (used by the sync).
import {
  json,
  readJson,
  requireKv,
  getSessionEmail,
  dataKey,
  MAX_READING_LIST_BYTES,
} from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const kvError = requireKv(env);
  if (kvError) return kvError;

  const email = await getSessionEmail(request, env);
  if (!email) return json({ error: "Not signed in." }, 401);

  const stored = await env.ACCOUNTS.get(dataKey(email));
  let readingList = {};
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") readingList = parsed;
    } catch {
      readingList = {};
    }
  }
  return json({ readingList });
}

export async function onRequestPut({ request, env }) {
  const kvError = requireKv(env);
  if (kvError) return kvError;

  const email = await getSessionEmail(request, env);
  if (!email) return json({ error: "Not signed in." }, 401);

  const data = await readJson(request);
  if (!data) return json({ error: "Invalid JSON body" }, 400);

  const readingList = data.readingList;
  if (!readingList || typeof readingList !== "object" || Array.isArray(readingList)) {
    return json({ error: "readingList must be an object." }, 400);
  }

  const serialized = JSON.stringify(readingList);
  if (serialized.length > MAX_READING_LIST_BYTES) {
    return json({ error: "Reading list is too large to sync." }, 413);
  }

  await env.ACCOUNTS.put(dataKey(email), serialized);
  return json({ saved: true });
}
