// Dynamic API route: runs on Cloudflare at /api/health
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      time: new Date().toISOString(),
      service: "AI Safety Resources",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
