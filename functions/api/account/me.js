// GET /api/account/me → reports whether accounts are available and who is signed in.
import { json, accountsEnabled, getSessionEmail } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!accountsEnabled(env)) {
    return json({ available: false, authenticated: false });
  }
  const email = await getSessionEmail(request, env);
  return json({ available: true, authenticated: Boolean(email), email: email || null });
}
