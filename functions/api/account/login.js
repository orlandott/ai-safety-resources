// POST /api/account/login  { email, password } → verifies + starts a session.
import {
  json,
  readJson,
  requireKv,
  normalizeEmail,
  verifyPassword,
  verifyAgainstDummy,
  createSession,
  sessionCookie,
  userKey,
} from "../_lib.js";

export async function onRequestPost({ request, env }) {
  const kvError = requireKv(env);
  if (kvError) return kvError;

  const data = await readJson(request);
  if (!data) return json({ error: "Invalid JSON body" }, 400);

  const email = normalizeEmail(data.email);
  const password = (data.password || "").toString();
  if (!email || !password) {
    return json({ error: "Email and password are required." }, 400);
  }

  const stored = await env.ACCOUNTS.get(userKey(email));
  // Run a hash either way so a missing account and a wrong password take a
  // similar amount of time (avoids leaking which emails are registered).
  let ok = false;
  if (stored) {
    try {
      const user = JSON.parse(stored);
      ok = await verifyPassword(password, user.passwordHash);
    } catch {
      ok = false;
    }
  } else {
    await verifyAgainstDummy(password);
  }

  if (!ok) {
    return json({ error: "Invalid email or password." }, 401);
  }

  const token = await createSession(env, email);
  return json({ email, authenticated: true }, 200, {
    "Set-Cookie": sessionCookie(token),
  });
}
