// Cloudflare Pages Function: receives suggestion + contact form submissions and sends email via Resend.
// Set RESEND_API_KEY in Cloudflare Pages (Settings → Environment variables). Optional: CONTACT_EMAIL (default contact@ai-safety-resources.com).

const RESEND_API = "https://api.resend.com/emails";
const DEFAULT_TO = "contact@ai-safety-resources.com";

const ALLOWED_ORIGINS = [
  "https://ai-safety-resources.com",
  "https://www.ai-safety-resources.com",
];

const MAX_BODY_BYTES = 10 * 1024;

const FIELD_LIMITS = {
  name: 200,
  title: 200,
  author: 200,
  email: 254,
  submitter_email: 254,
  link: 2000,
  category: 100,
  message: 5000,
  _subject: 150,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveOrigin(request) {
  const origin = request.headers.get("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow Cloudflare Pages preview deployments.
  if (/^https:\/\/[a-z0-9-]+\.ai-safety-resources\.pages\.dev$/.test(origin)) return origin;
  return null;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function cleanField(value, limit) {
  return String(value == null ? "" : value)
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, limit);
}

function sanitize(data) {
  const out = {};
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    // message keeps newlines (it is the email body), everything else is single-line
    out[field] =
      field === "message"
        ? String(data[field] == null ? "" : data[field]).trim().slice(0, limit)
        : cleanField(data[field], limit);
  }
  return out;
}

function buildEmailText(data, hasMessage) {
  if (hasMessage) {
    return [
      "Contact form submission",
      "---",
      `Name: ${data.name || "(not provided)"}`,
      `Email: ${data.email}`,
      "",
      data.message,
    ].join("\n");
  }
  return [
    "Suggestion submission",
    "---",
    `Title: ${data.title || data.name}`,
    `Author (or director, host, etc.): ${data.author}`,
    `Link: ${data.link}`,
    `Category: ${data.category}`,
    `Submitter email: ${data.submitter_email || data.email}`,
  ].join("\n");
}

export async function onRequestOptions(context) {
  const origin = resolveOrigin(context.request);
  if (!origin) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = resolveOrigin(request);
  if (!origin) {
    return json({ error: "Forbidden" }, 403, ALLOWED_ORIGINS[0]);
  }

  const apiKey = env.RESEND_API_KEY;
  const to = (env.CONTACT_EMAIL || DEFAULT_TO).toString().trim();

  if (!apiKey || !apiKey.startsWith("re_")) {
    return json(
      { error: "Email not configured. Set RESEND_API_KEY in Cloudflare Pages environment variables." },
      503,
      origin
    );
  }

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return json({ error: "Content-Type must be application/json" }, 400, origin);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "Request body too large" }, 413, origin);
  }

  let raw;
  try {
    const bodyText = await request.text();
    if (bodyText.length > MAX_BODY_BYTES) {
      return json({ error: "Request body too large" }, 413, origin);
    }
    raw = JSON.parse(bodyText);
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const data = sanitize(raw);
  const hasMessage = Boolean(raw._subject && raw.message != null);

  if (hasMessage) {
    if (!data.message) {
      return json({ error: "Message is required" }, 400, origin);
    }
  } else if (!data.title && !data.name) {
    return json({ error: "Title is required" }, 400, origin);
  }

  const subject = data._subject || "Submission from AI Safety Resources";
  const text = buildEmailText(data, hasMessage);
  const replyTo = data.email || data.submitter_email;

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "AI-Safety-Resources/1.0",
      },
      body: JSON.stringify({
        from: "AI Safety Resources <onboarding@resend.dev>",
        to: [to],
        reply_to: EMAIL_RE.test(replyTo) ? replyTo : undefined,
        subject,
        text,
      }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json(
        { error: out.message || out.error || "Failed to send email" },
        res.status >= 400 && res.status < 600 ? res.status : 502,
        origin
      );
    }
    return json({ success: true }, 200, origin);
  } catch (err) {
    return json({ error: "Failed to send email" }, 502, origin);
  }
}
