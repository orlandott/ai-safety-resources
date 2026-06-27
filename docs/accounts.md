# Accounts & cross-device sync

By default, the reading list and progress tracker are stored only in the
visitor's browser (`localStorage`). That data is lost if they clear site data
or switch devices. Optional accounts let a visitor back up that progress and
sync it across devices.

Accounts are entirely optional and degrade gracefully: if the API below is not
configured, the site stays in local-only mode and the account UI hides itself.

## How it works

- **API** — Cloudflare Pages Functions under [`functions/api/account/`](../functions/api/account):
  - `POST /api/account/signup` — create an account (`{ email, password }`).
  - `POST /api/account/login` — start a session.
  - `POST /api/account/logout` — end the session.
  - `GET  /api/account/me` — report availability + who is signed in.
  - `GET/PUT /api/account/reading-list` — read/replace the synced progress blob.
- **Storage** — a single Cloudflare KV namespace bound as `ACCOUNTS`:
  - `user:<email>` → `{ email, passwordHash, createdAt }`
  - `data:<email>` → the synced reading-list JSON
  - `session:<token>` → `<email>` (30-day TTL)
- **Auth** — passwords are hashed with PBKDF2-SHA256 (100k iterations, random
  salt). Sessions are random 256-bit tokens kept in an `HttpOnly`, `Secure`,
  `SameSite=Lax` cookie. The API is same-origin only (no CORS).
- **Sync** — on sign-in the client pulls the server copy, unions it with the
  local copy (most-recently-updated entry wins per resource), and pushes the
  merged result back. Later changes are pushed automatically (debounced).

## Setup

1. Create the KV namespace (production + preview):

   ```bash
   npx wrangler kv namespace create ACCOUNTS
   npx wrangler kv namespace create ACCOUNTS --preview
   ```

2. Bind it as `ACCOUNTS`, either by:
   - uncommenting the `[[kv_namespaces]]` block in
     [`wrangler.toml`](../wrangler.toml) and pasting in the printed IDs, or
   - adding the binding in the Cloudflare dashboard under
     **Pages → your project → Settings → Functions → KV namespace bindings**
     (variable name `ACCOUNTS`).

3. Redeploy. `GET /api/account/me` should now return `{ "available": true, … }`,
   and the "Save your progress across devices" controls appear in the
   **Your saved resources** panel.

## Notes & limitations

- This is intentionally lightweight: email + password, no email verification or
  password reset yet. Add those before promoting it heavily.
- The synced blob is capped at 512 KB per account.
- Removing the `ACCOUNTS` binding returns the site to local-only mode without
  breaking anything; existing browsers keep their local data.
