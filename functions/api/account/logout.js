// POST /api/account/logout → clears the session (server + cookie).
import {
  json,
  accountsEnabled,
  getSessionToken,
  sessionKey,
  clearSessionCookie,
} from "../_lib.js";

export async function onRequestPost({ request, env }) {
  if (accountsEnabled(env)) {
    const token = getSessionToken(request);
    if (token) {
      await env.ACCOUNTS.delete(sessionKey(token));
    }
  }
  return json({ authenticated: false }, 200, {
    "Set-Cookie": clearSessionCookie(),
  });
}
