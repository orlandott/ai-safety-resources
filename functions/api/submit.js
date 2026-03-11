const TRACK_LABELS = {
  entry_point: "The Entry Point (Primers & Essays)",
  canon: "The Canon (Foundational Books)",
  problem_space: "The Problem Space (Research Agendas & Concepts)",
  technical_frontier: "The Technical Frontier (Mechanisms & Interpretability)",
  speculative_fiction: "Speculative Fiction (AI-Relevant Sci-Fi)",
};

const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwQY1XXNQxh1_6rxTrMEXlk3aDUidhsQM8hq5T0Qzbv8tfErjqldlDub98STgnHtXj9DA/exec";

function json(res, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildAppsScriptPayload(data) {
  const trackLabel = TRACK_LABELS[data.track] || data.track;
  const payload = new URLSearchParams();
  payload.set("name", data.name);
  payload.set("title", data.name);
  payload.set("book_title", data.name);
  payload.set("author", data.author);
  payload.set("email", data.email || "");
  payload.set("submitter_email", data.email || "");
  payload.set("contact_email", data.email || "");
  payload.set("link", data.link);
  payload.set("pages", data.pages || "");
  payload.set("track_label", trackLabel);
  payload.set("track", trackLabel);
  payload.set("reading_track", trackLabel);
  payload.set("readingTrack", trackLabel);
  payload.set("category", trackLabel);
  payload.set("track_key", data.track || "");
  payload.set("submitted_at", new Date().toISOString());
  payload.set(
    "payload_json",
    JSON.stringify({
      name: data.name,
      title: data.name,
      author: data.author,
      email: data.email || "",
      link: data.link,
      pages: data.pages || "",
      track: trackLabel,
      reading_track: trackLabel,
      category: trackLabel,
      track_key: data.track || "",
    })
  );
  return payload.toString();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = env?.APPS_SCRIPT_ENDPOINT_URL || DEFAULT_APPS_SCRIPT_URL;

  let data;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    data = {
      name: (form.get("name") || "").toString().trim(),
      author: (form.get("author") || "").toString().trim(),
      email: (form.get("email") || "").toString().trim(),
      link: (form.get("link") || "").toString().trim(),
      pages: (form.get("pages") ?? "").toString().trim(),
      track: (form.get("track") || "entry_point").toString(),
    };
  } else {
    return json({ error: "Content-Type must be application/json or application/x-www-form-urlencoded" }, 400);
  }

  const name = (data.name || "").trim();
  const author = (data.author || "").trim();
  const link = (data.link || "").trim();
  if (!name || !author || !link) {
    return json({ error: "Missing required fields: name, author, and link" }, 400);
  }

  const body = buildAppsScriptPayload({
    name,
    author,
    email: (data.email || "").trim(),
    link,
    pages: (data.pages ?? "").toString().trim(),
    track: data.track || "entry_point",
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });
    if (!res.ok) {
      return json({ error: "Submission endpoint returned an error" }, 502);
    }
    return json({ success: true });
  } catch (err) {
    return json({ error: "Failed to forward suggestion" }, 502);
  }
}
