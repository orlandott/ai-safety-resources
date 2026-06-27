// Shared helpers for the account API (Cloudflare Pages Functions).
//
// Files beginning with an underscore are NOT turned into routes by Pages, so
// this module is import-only. It backs the endpoints under functions/api/account/.
//
// Storage model (a single KV namespace bound as `ACCOUNTS`):
//   user:<email>      → JSON { email, passwordHash, createdAt }
//   data:<email>      → JSON reading-list state (the synced progress blob)
//   session:<token>   → <email>  (with a 30-day TTL)

export const SESSION_COOKIE = "aisr_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PBKDF2_ITERATIONS = 100000;
// Cap on the stored reading-list blob to keep a single account from filling KV.
export const MAX_READING_LIST_BYTES = 512 * 1024;

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function readJson(request) {
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    const data = await request.json();
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

// ── Accounts availability ────────────────────────────────────────────────────

export function accountsEnabled(env) {
  return Boolean(env && env.ACCOUNTS && typeof env.ACCOUNTS.get === "function");
}

export function requireKv(env) {
  return accountsEnabled(env)
    ? null
    : json(
        { error: "Accounts are not configured on this deployment.", available: false },
        503
      );
}

export const userKey = (email) => `user:${email}`;
export const dataKey = (email) => `data:${email}`;
export const sessionKey = (token) => `session:${token}`;

// ── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  return (value || "").toString().trim().toLowerCase();
}

export function validateEmail(email) {
  if (!email) return "Email is required.";
  if (email.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password) {
  const value = (password || "").toString();
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 200) return "Password is too long.";
  return null;
}

// ── Encoding helpers ─────────────────────────────────────────────────────────

const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
const bytesToHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// ── Password hashing (PBKDF2-SHA256 via Web Crypto) ──────────────────────────

async function deriveBits(password, salt, iterations, length) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    length * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS, 32);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = (stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations < 1) return false;
  let salt;
  let expected;
  try {
    salt = base64ToBytes(parts[2]);
    expected = base64ToBytes(parts[3]);
  } catch {
    return false;
  }
  const actual = await deriveBits(password, salt, iterations, expected.length);
  return timingSafeEqual(actual, expected);
}

// A fixed hash used to keep login timing roughly constant when the account does
// not exist, so the endpoint does not leak which emails are registered.
const DUMMY_HASH =
  "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function verifyAgainstDummy(password) {
  await verifyPassword(password, DUMMY_HASH);
  return false;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function randomToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(env, email) {
  const token = randomToken();
  await env.ACCOUNTS.put(sessionKey(token), email, {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return token;
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

export function getSessionToken(request) {
  return readCookie(request, SESSION_COOKIE);
}

export async function getSessionEmail(request, env) {
  if (!accountsEnabled(env)) return null;
  const token = getSessionToken(request);
  if (!token) return null;
  const email = await env.ACCOUNTS.get(sessionKey(token));
  return email || null;
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return (
    `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; ` +
    `Max-Age=${maxAge}`
  );
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
