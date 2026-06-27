// POST /api/account/signup  { email, password } → creates an account + session.
import {
  json,
  readJson,
  requireKv,
  normalizeEmail,
  validateEmail,
  validatePassword,
  hashPassword,
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

  const emailError = validateEmail(email);
  if (emailError) return json({ error: emailError }, 400);
  const passwordError = validatePassword(password);
  if (passwordError) return json({ error: passwordError }, 400);

  const existing = await env.ACCOUNTS.get(userKey(email));
  if (existing) {
    return json({ error: "An account with this email already exists." }, 409);
  }

  const passwordHash = await hashPassword(password);
  const user = { email, passwordHash, createdAt: new Date().toISOString() };
  await env.ACCOUNTS.put(userKey(email), JSON.stringify(user));

  const token = await createSession(env, email);
  return json({ email, authenticated: true }, 200, {
    "Set-Cookie": sessionCookie(token),
  });
}
