// Generates the app's icon set from the vector mark defined below.
// Run from mobile/: `node scripts/make-icons.mjs`.
//
// The mark is a shield holding an open book — "safety" over "the reading
// list" — drawn as two flat shapes so it stays legible at the 40pt the icon
// actually renders at on a home screen. Every output here is the same mark on
// the same green ground, so the iOS icon, the Android adaptive icon, the web
// favicon, the store listings, and the in-app header logo all read as one app.
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");

// Site palette (public/style.css): warm cream on the green accent.
const CREAM = "#f4f1ea";
const GREEN = "#2f7a52";
const GREEN_LIGHT = "#3c9265";
const GREEN_DARK = "#17492f";
const GOLD = "#c8a45c";
const INK = "#12100d";

// --- the mark -------------------------------------------------------------
// Drawn in a 1000x1000 box. The shield spans 110..890 across and 60..940 down;
// the book sits in the shield's wide upper half, above the taper.
const SHIELD = `M166 60H834a56 56 0 0 1 56 56v404c0 206-164 358-390 420C274 878 110 726 110 520V116a56 56 0 0 1 56-56z`;
const PAGE_LEFT = `M489 357C424 308 327 290 208 294v290c119-5 216 14 281 62z`;
const PAGE_RIGHT = `M511 357c65-49 162-67 281-63v290c-119-5-216 14-281 62z`;
const SPINE = `M489 359h22v285h-22z`;

/**
 * The mark as a standalone SVG. `ground` paints the shield, `figure` the book
 * cut into it; passing `ground: "none"` leaves a book-shaped hole instead.
 */
function markSvg({ size, shield, book, spine }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
  <path d="${SHIELD}" fill="${shield}"/>
  <path d="${PAGE_LEFT}" fill="${book}"/>
  <path d="${PAGE_RIGHT}" fill="${book}"/>
  <path d="${SPINE}" fill="${spine}"/>
</svg>`);
}

/** Full-bleed background: a soft diagonal gradient so the tile isn't flat. */
function groundSvg({ width, height, from, to }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
</svg>`);
}

/**
 * The icon tile: the mark centred on the gradient ground at `markScale` of the
 * canvas. Returns a PNG buffer with no alpha channel — iOS rejects app icons
 * that carry one.
 */
async function tile(size, { markScale = 0.78, from = GREEN_LIGHT, to = GREEN_DARK, shield = CREAM, book = GREEN, spine = GOLD } = {}) {
  const mark = Math.round(size * markScale);
  const offset = Math.round((size - mark) / 2);
  return sharp(groundSvg({ width: size, height: size, from, to }))
    .composite([{ input: markSvg({ size: mark, shield, book, spine }), left: offset, top: offset }])
    .flatten({ background: from })
    .removeAlpha()
    .png()
    .toBuffer();
}

/** The mark alone on transparency, centred in a square canvas. */
async function markOnly(size, { markScale, shield, book, spine }) {
  const mark = Math.round(size * markScale);
  const offset = Math.round((size - mark) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: markSvg({ size: mark, shield, book, spine }), left: offset, top: offset }])
    .png()
    .toBuffer();
}

/** Rounds a square tile to iOS-ish corners, for use inside the app's own UI. */
async function rounded(buffer, size, radius) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
  return sharp(buffer)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function write(buffer, ...parts) {
  const out = join(assets, ...parts);
  await mkdir(dirname(out), { recursive: true });
  await sharp(buffer).toFile(out);
  console.log(`wrote assets/${parts.join("/")}`);
}

// --- iOS ------------------------------------------------------------------
// The universal/light icon, plus the dark and tinted variants iOS 18 asks for.
// All three are the same mark at the same size so the app stays recognisable
// however the home screen is themed.
await write(await tile(1024), "icon.png");
await write(
  await tile(1024, { from: "#1d2420", to: INK, shield: CREAM, book: "#1d2420", spine: GOLD }),
  "icon-dark.png"
);
// Tinted icons are graded by the system from the image's luminance, so this
// one is grayscale end to end.
await write(
  await tile(1024, { from: "#3a3a3a", to: "#101010", shield: "#e8e8e8", book: "#3a3a3a", spine: "#9a9a9a" }),
  "icon-tinted.png"
);

// --- Android --------------------------------------------------------------
// The launcher masks the outer ~25% of an adaptive icon, so the foreground
// runs at a smaller scale than the iOS tile to stay inside the safe zone.
const ANDROID_SCALE = 0.58;
await write(
  await markOnly(1024, { markScale: ANDROID_SCALE, shield: CREAM, book: GREEN, spine: GOLD }),
  "android-icon-foreground.png"
);
await write(await sharp(groundSvg({ width: 1024, height: 1024, from: GREEN_LIGHT, to: GREEN_DARK })).png().toBuffer(), "android-icon-background.png");
// Themed icons are re-coloured by the launcher: ship a flat white silhouette
// with the book knocked out so the shape survives the tint.
await write(
  await markOnly(1024, {
    markScale: ANDROID_SCALE,
    shield: "#ffffff",
    book: "rgba(0,0,0,0)",
    spine: "rgba(0,0,0,0)",
  }),
  "android-icon-monochrome.png"
);

// --- Splash and web -------------------------------------------------------
await write(await markOnly(1024, { markScale: 0.62, shield: GREEN, book: CREAM, spine: GOLD }), "splash-icon.png");
await write(await tile(48), "favicon.png");

// --- In-app header --------------------------------------------------------
// A miniature of the home-screen icon, so the app's own chrome matches what
// the user tapped. 256px covers @3x at the ~44pt it renders at.
await write(await rounded(await tile(256), 256, 58), "logo-emblem.png");

// --- Store listings -------------------------------------------------------
// Not bundled into the app; uploaded in App Store Connect / the Play Console.
await write(await tile(512), "play-store", "icon-512.png");

const featureIcon = await rounded(await tile(300), 300, 68);
await write(
  await sharp(groundSvg({ width: 1024, height: 500, from: GREEN_LIGHT, to: GREEN_DARK }))
    .composite([
      { input: featureIcon, left: 96, top: 100 },
      {
        input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300">
  <text x="0" y="118" font-family="DejaVu Serif, Liberation Serif, serif" font-size="62" font-weight="bold" fill="${CREAM}">AI Safety</text>
  <text x="0" y="192" font-family="DejaVu Serif, Liberation Serif, serif" font-size="62" font-weight="bold" fill="${CREAM}">Resources</text>
  <text x="4" y="248" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-size="26" fill="${GOLD}">Read, watch, and track the canon</text>
</svg>`),
        left: 452,
        top: 100,
      },
    ])
    .flatten({ background: GREEN })
    .removeAlpha()
    .png()
    .toBuffer(),
  "play-store",
  "feature-graphic.png"
);
