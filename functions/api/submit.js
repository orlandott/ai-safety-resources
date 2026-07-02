// Cloudflare Pages Function: receives suggestion + contact form submissions and sends email via Resend.
// Set RESEND_API_KEY in Cloudflare Pages (Settings → Environment variables).
// Optional: CONTACT_EMAIL (recipient, default contact@ai-safety-resources.com) and
// FROM_EMAIL (sender, default Resend's test sender — which only delivers to your
// own Resend account email until you verify a domain in Resend).

const RESEND_API = "https://api.resend.com/emails";
const DEFAULT_TO = "contact@ai-safety-resources.com";
const DEFAULT_FROM = "AI Safety Resources <onboarding@resend.dev>";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

const FIELD_MAX = 300;
const MESSAGE_MAX = 5000;
const clean = (value, max = FIELD_MAX) =>
  (value == null ? "" : String(value)).trim().slice(0, max);

function isContactPayload(data) {
  return data.message != null;
}

// Returns an error string, or null if the payload is sendable.
function validatePayload(data) {
  if (isContactPayload(data)) {
    if (!clean(data.message)) return "Message is required.";
    return null;
  }
  if (!clean(data.title || data.name)) return "Title is required.";
  if (!clean(data.link)) return "Link is required.";
  return null;
}

function buildEmailText(data) {
  if (isContactPayload(data)) {
    return [
      "Contact form submission",
      "---",
      `Name: ${clean(data.name) || "(not provided)"}`,
      `Email: ${clean(data.email)}`,
      "",
      clean(data.message, MESSAGE_MAX),
    ].join("\n");
  }
  return [
    "Suggestion submission",
    "---",
    `Title: ${clean(data.title || data.name)}`,
    `Author (or director, host, etc.): ${clean(data.author)}`,
    `Link: ${clean(data.link, 2048)}`,
    `Category: ${clean(data.category)}`,
    `Submitter email: ${clean(data.submitter_email || data.email)}`,
  ].join("\n");
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.RESEND_API_KEY;
  const to = (env.CONTACT_EMAIL || DEFAULT_TO).toString().trim();
  const from = (env.FROM_EMAIL || DEFAULT_FROM).toString().trim();

  if (!apiKey || !apiKey.startsWith("re_")) {
    return json(
      { error: "Email not configured. Set RESEND_API_KEY in Cloudflare Pages environment variables." },
      503
    );
  }

  let data;
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      data = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
  } else {
    return json(
      { error: "Content-Type must be application/json" },
      400
    );
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success so
  // bots don't learn they were filtered.
  if (clean(data._hp || data._honeypot)) {
    return json({ success: true });
  }

  const validationError = validatePayload(data);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const subject = clean(data._subject, 200) || "Submission from AI Safety Resources";
  const text = buildEmailText(data);

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "AI-Safety-Resources/1.0",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: (data.email || data.submitter_email || "").toString().trim() || undefined,
        subject,
        text,
      }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json(
        { error: out.message || out.error || "Failed to send email" },
        res.status >= 400 && res.status < 600 ? res.status : 502
      );
    }
    return json({ success: true });
  } catch (err) {
    return json({ error: "Failed to send email" }, 502);
  }
}
