// Standalone Cloudflare Worker: form submissions → Resend → your email.
// Secrets: npx wrangler secret put RESEND_API_KEY
// Optional: CONTACT_EMAIL in wrangler.toml [vars] or as secret (default: contact@ai-safety-resources.com)

const RESEND_API = "https://api.resend.com/emails";
const DEFAULT_TO = "contact@ai-safety-resources.com";

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

function buildEmailText(data) {
  if (data._subject && data.message != null) {
    return [
      "Contact form submission",
      "---",
      `Name: ${(data.name || "").trim() || "(not provided)"}`,
      `Email: ${(data.email || "").trim()}`,
      "",
      (data.message || "").trim(),
    ].join("\n");
  }
  return [
    "Suggestion submission",
    "---",
    `Title: ${(data.title || data.name || "").trim()}`,
    `Author (or director, host, etc.): ${(data.author || "").trim()}`,
    `Link: ${(data.link || "").trim()}`,
    `Category: ${data.category || ""}`,
    `Submitter email: ${(data.submitter_email || data.email || "").trim()}`,
  ].join("\n");
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
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

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const apiKey = env.RESEND_API_KEY;
    const to = (env.CONTACT_EMAIL || DEFAULT_TO).toString().trim();

    if (!apiKey || !String(apiKey).startsWith("re_")) {
      return json(
        { error: "Email not configured. Run: npx wrangler secret put RESEND_API_KEY" },
        503
      );
    }

    let data;
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      return json({ error: "Content-Type must be application/json" }, 400);
    }
    try {
      data = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const subject = (data._subject || "Submission from AI Safety Resources").toString().trim();
    const text = buildEmailText(data);

    try {
      const res = await fetch(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "AI-Safety-Resources/1.0",
        },
        body: JSON.stringify({
          from: "AI Safety Resources <onboarding@resend.dev>",
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
  },
};
