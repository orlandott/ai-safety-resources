// Dynamic API route: runs on Cloudflare at /api/geo. Returns the ISO 3166-1
// alpha-2 country code Cloudflare resolved for the requesting IP, so the
// cookie-consent banner can decide whether (and in which variant) to show.
// "XX" when Cloudflare couldn't determine one.
export async function onRequestGet({ request }) {
  const country =
    (request.cf && request.cf.country) ||
    request.headers.get("cf-ipcountry") ||
    "XX";
  return new Response(JSON.stringify({ country }), {
    headers: {
      "Content-Type": "application/json",
      // The answer is per-visitor: any shared or persisted cache would leak
      // one visitor's country to the next.
      "Cache-Control": "no-store",
    },
  });
}
