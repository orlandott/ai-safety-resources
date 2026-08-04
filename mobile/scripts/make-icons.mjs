// Generates the app's icon set from the vector mark defined below.
// Run from mobile/: `node scripts/make-icons.mjs`.
//
// The mark is a hand-drawn vector redraw of the site's robot emblem
// (public/images/logo-ai-safety-resources.png). It keeps the original's actual
// features rather than an abstraction of them: the domed helmet with its
// angled jaw, the cream crest frame around a raised keystone, the side ear
// plates, the big glowing cyan eyes in dark sockets, the recessed grille mouth,
// the segmented collar, the pauldrons with their joint discs, the segmented
// arms, and the chest plate with its glowing cyan core over a belt grille. It
// also keeps the original's construction — every armour mass is a dark outline,
// a cream rim, then a gold plate — which is what makes it read as that
// illustration rather than as a generic robot.
//
// Two deliberate departures from the source: the robot is cropped to a bust
// (head, shoulders, chest) because the full standing figure is far too tall to
// fill a square, and the head runs about 1.4x its true size relative to the
// shoulders so the eyes still resolve at 29px. Everything is chunky by design:
// nothing is thinner than ~8 units of the 720-unit tall drawing box, since a
// hairline at 29px is just noise.
//
// Every output is that one mark on one green ground, so the iOS icon, the
// Android adaptive icon, the web favicon, the store listings, and the in-app
// header logo all read as the same app.
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");

// Site palette (public/style.css) plus the emblem's own cyan and gold.
const CREAM = "#f4f1ea";
const GREEN = "#2f7a52";
const GREEN_LIGHT = "#3c9265";
const GREEN_DARK = "#17492f";
const GOLD = "#c8a45c";
const CYAN = "#6fe3dd";
const INK = "#12100d";
// The original's line work is a near-black warm outline. Interior recesses and
// panel lines use it here; it is always drawn inside the cream/gold body, never
// against the green ground, so it only ever has to contrast with the armour.
const SHADE = "#1f2a23";

// --- the mark -------------------------------------------------------------
// Drawn in a local box spanning x 18..662 (644 wide) and y 0..720, then scaled
// and centred into the 1000-unit icon canvas by `mark()`. Content sits at
// y 6..714, so the 6-unit margins top and bottom keep the box symmetric.
const ROBOT_W = 644;
const ROBOT_H = 720;
const ROBOT_X = 18;

/**
 * The robot bust.
 *
 * `body` is the armour, `eye` the glowing cyan (eyes and chest core), `trim` the
 * gold panels, `mouth` the grille — separate from `trim` only so the monochrome
 * variant can knock it out — and `shade` the recessed interior line work, which
 * the monochrome variant flips to white so the silhouette stays solid.
 */
function shapes({ body, eye, trim, mouth = trim, shade = SHADE }) {
  // Every armour mass is built the way the original artwork builds it: a dark
  // outline, a light rim inside that, then the gold plate inside that. Each
  // limb's outline, rim and plate are drawn in three passes so the pauldron and
  // the arm fuse into one shoulder rather than reading as two stacked blobs.
  return `
    <!-- chest: a broad plate tapering to the waist, carrying the glowing core -->
    <path d="M168 372 H512 V540 C512 630 452 690 340 714 C228 690 168 630 168 540 Z" fill="${shade}"/>
    <path d="M180 384 H500 V540 C500 620 444 676 340 700 C236 676 180 620 180 540 Z" fill="${body}"/>
    <path d="M198 402 H482 V540 C482 606 434 656 340 678 C246 656 198 606 198 540 Z" fill="${trim}"/>
    <rect x="216" y="458" width="16" height="84" rx="8" fill="${shade}" transform="rotate(-15 224 500)"/>
    <rect x="448" y="458" width="16" height="84" rx="8" fill="${shade}" transform="rotate(15 456 500)"/>
    <circle cx="340" cy="500" r="88" fill="${shade}"/>
    <circle cx="340" cy="500" r="78" fill="${body}"/>
    <circle cx="340" cy="500" r="62" fill="${shade}"/>
    <circle cx="340" cy="500" r="50" fill="${eye}"/>
    <rect x="292" y="604" width="96" height="46" rx="16" fill="${shade}"/>
    <rect x="304" y="616" width="72" height="22" rx="10" fill="${body}"/>

    <!-- collar -->
    <path d="M262 356 H418 L434 414 H246 Z" fill="${shade}"/>
    <path d="M274 368 H406 L420 404 H260 Z" fill="${body}"/>
    <path d="M290 380 H390 L400 400 H280 Z" fill="${trim}"/>
    <rect x="306" y="382" width="14" height="18" fill="${shade}"/>
    <rect x="360" y="382" width="14" height="18" fill="${shade}"/>

    <!-- shoulders and arms: a pauldron capping the chest corner, and a straight
         segmented limb below it, each built outline / rim / plate -->
    <rect x="18"  y="354" width="174" height="154" rx="58" fill="${shade}"/>
    <rect x="488" y="354" width="174" height="154" rx="58" fill="${shade}"/>
    <rect x="34"  y="458" width="128" height="242" rx="62" fill="${shade}"/>
    <rect x="518" y="458" width="128" height="242" rx="62" fill="${shade}"/>
    <rect x="30"  y="366" width="150" height="130" rx="46" fill="${body}"/>
    <rect x="500" y="366" width="150" height="130" rx="46" fill="${body}"/>
    <rect x="46"  y="470" width="104" height="218" rx="50" fill="${body}"/>
    <rect x="530" y="470" width="104" height="218" rx="50" fill="${body}"/>
    <rect x="48"  y="384" width="114" height="94"  rx="32" fill="${trim}"/>
    <rect x="518" y="384" width="114" height="94"  rx="32" fill="${trim}"/>
    <rect x="62"  y="486" width="72"  height="186" rx="34" fill="${trim}"/>
    <rect x="546" y="486" width="72"  height="186" rx="34" fill="${trim}"/>
    <rect x="74"  y="556" width="48"  height="14"  rx="7" fill="${shade}"/>
    <rect x="558" y="556" width="48"  height="14"  rx="7" fill="${shade}"/>
    <rect x="74"  y="592" width="48"  height="14"  rx="7" fill="${shade}"/>
    <rect x="558" y="592" width="48"  height="14"  rx="7" fill="${shade}"/>
    <rect x="74"  y="628" width="48"  height="14"  rx="7" fill="${shade}"/>
    <rect x="558" y="628" width="48"  height="14"  rx="7" fill="${shade}"/>
    <circle cx="86"  cy="416" r="30" fill="${shade}"/>
    <circle cx="594" cy="416" r="30" fill="${shade}"/>
    <circle cx="86"  cy="416" r="23" fill="${body}"/>
    <circle cx="594" cy="416" r="23" fill="${body}"/>
    <circle cx="86"  cy="416" r="13" fill="${trim}"/>
    <circle cx="594" cy="416" r="13" fill="${trim}"/>

    <!-- ear plates -->
    <rect x="124" y="168" width="84" height="132" rx="40" fill="${shade}"/>
    <rect x="472" y="168" width="84" height="132" rx="40" fill="${shade}"/>
    <rect x="136" y="180" width="60" height="108" rx="28" fill="${body}"/>
    <rect x="484" y="180" width="60" height="108" rx="28" fill="${body}"/>
    <rect x="148" y="194" width="34" height="78"  rx="16" fill="${trim}"/>
    <rect x="498" y="194" width="34" height="78"  rx="16" fill="${trim}"/>
    <rect x="156" y="208" width="18" height="50"  rx="9"  fill="${shade}"/>
    <rect x="506" y="208" width="18" height="50"  rx="9"  fill="${shade}"/>

    <!-- helmet dome: rounded crown, straight sides, jaw angled in to the chin -->
    <path d="M178 157 Q178 6 340 6 Q502 6 502 157 V244 L474 352 Q466 384 434 384 H246 Q214 384 206 352 Z" fill="${shade}"/>
    <path d="M190 162 Q190 18 340 18 Q490 18 490 162 V240 L464 340 Q457 368 429 368 H251 Q223 368 216 340 Z" fill="${body}"/>
    <path d="M208 164 Q208 30 340 30 Q472 30 472 164 V234 L448 326 Q442 350 418 350 H262 Q238 350 232 326 Z" fill="${shade}"/>
    <path d="M220 166 Q220 42 340 42 Q460 42 460 166 V230 L438 314 Q433 336 411 336 H269 Q247 336 242 314 Z" fill="${trim}"/>

    <!-- centre crest: a cream frame around a raised keystone, brow ridge below -->
    <rect x="250" y="24" width="180" height="126" rx="46" fill="${shade}"/>
    <rect x="262" y="36" width="156" height="102" rx="36" fill="${body}"/>
    <rect x="284" y="54" width="112" height="70"  rx="25" fill="${shade}"/>
    <rect x="294" y="64" width="92"  height="58"  rx="18" fill="${trim}"/>

    <!-- eyes -->
    <circle cx="276" cy="208" r="48" fill="${shade}"/>
    <circle cx="404" cy="208" r="48" fill="${shade}"/>
    <circle cx="276" cy="208" r="38" fill="${eye}"/>
    <circle cx="404" cy="208" r="38" fill="${eye}"/>

    <!-- grille mouth, recessed -->
    <rect x="266" y="268" width="148" height="56" rx="19" fill="${shade}"/>
    <rect x="278" y="282" width="124" height="28" rx="13" fill="${mouth}"/>`;
}

/**
 * A reduced silhouette for the Android themed icon, in the same drawing box as
 * `shapes()`. That variant is re-coloured flat by the launcher, so pushing the
 * full mark through it fills every interior line and the robot collapses into a
 * blob. Android's own guidance is a simplified single-colour mark, so this drops
 * the arms and all panel detail and keeps the silhouette plus the four features
 * that carry the identity: crest, eyes, mouth, core.
 *
 * The pauldrons stay, reduced to plain caps: without shoulders the bust tapers
 * straight from head to chest and reads as a keyhole rather than a robot. The
 * collar is dropped for the opposite reason — flattened to one colour it only
 * cuts a notch into the neck.
 *
 * Returns white for solid and black for knockouts, ready to use as an SVG mask.
 */
function monoShapes() {
  return `
    <!-- silhouette: helmet, ear plates, shoulders, chest -->
    <path d="M178 157 Q178 6 340 6 Q502 6 502 157 V244 L474 352 Q466 384 434 384 H246 Q214 384 206 352 Z" fill="#fff"/>
    <rect x="124" y="168" width="84" height="132" rx="40" fill="#fff"/>
    <rect x="472" y="168" width="84" height="132" rx="40" fill="#fff"/>
    <rect x="18"  y="354" width="174" height="154" rx="58" fill="#fff"/>
    <rect x="488" y="354" width="174" height="154" rx="58" fill="#fff"/>
    <path d="M168 372 H512 V540 C512 630 452 690 340 714 C228 690 168 630 168 540 Z" fill="#fff"/>

    <!-- knockouts -->
    <rect x="284" y="54" width="112" height="70" rx="25" fill="#000"/>
    <circle cx="276" cy="208" r="44" fill="#000"/>
    <circle cx="404" cy="208" r="44" fill="#000"/>
    <rect x="266" y="268" width="148" height="56" rx="19" fill="#000"/>
    <circle cx="340" cy="500" r="62" fill="#000"/>`;
}

/**
 * The mark centred in a `size` square, occupying `fill` of its width.
 * `inner` lets a caller substitute differently-coloured shapes.
 */
function mark({ size, fill = 0.7, inner }) {
  const scale = (fill * 1000) / ROBOT_W;
  const x = (1000 - fill * 1000) / 2 - ROBOT_X * scale;
  const y = (1000 - ROBOT_H * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
    <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">${inner}</g>
  </svg>`;
}

/** Full-bleed background: a soft diagonal gradient so the tile isn't flat. */
function gradient(width, height, from, to) {
  return `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>`;
}

/**
 * An icon tile. Returns a PNG with no alpha channel — iOS rejects app icons
 * that carry one.
 */
async function tile(
  size,
  { from = GREEN_LIGHT, to = GREEN_DARK, body = CREAM, eye = CYAN, trim = GOLD, shade = SHADE, fill = 0.7 } = {}
) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
    ${gradient(1000, 1000, from, to)}
  </svg>`;
  const art = mark({ size, fill, inner: shapes({ body, eye, trim, shade }) });
  return sharp(Buffer.from(svg))
    .composite([{ input: Buffer.from(art) }])
    .flatten({ background: from })
    .removeAlpha()
    .png()
    .toBuffer();
}

/** The mark alone on transparency. */
async function markOnly(size, { body, eye, trim, shade, fill }) {
  return sharp(Buffer.from(mark({ size, fill, inner: shapes({ body, eye, trim, shade }) })))
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
await write(await tile(1024, { from: "#1d2420", to: INK }), "icon-dark.png");
// Tinted icons are graded by the system from the image's luminance, so this one
// is grayscale end to end.
await write(
  await tile(1024, {
    from: "#3a3a3a",
    to: "#101010",
    body: "#e8e8e8",
    eye: "#8f8f8f",
    trim: "#b4b4b4",
    shade: "#4a4a4a",
  }),
  "icon-tinted.png"
);

// --- Android --------------------------------------------------------------
// The launcher masks the outer ~25% of an adaptive icon, so the foreground runs
// smaller than the iOS tile to stay inside the safe zone.
const ANDROID_FILL = 0.55;
await write(
  await markOnly(1024, { body: CREAM, eye: CYAN, trim: GOLD, fill: ANDROID_FILL }),
  "android-icon-foreground.png"
);
await write(
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1000 1000">${gradient(1000, 1000, GREEN_LIGHT, GREEN_DARK)}</svg>`
    )
  )
    .png()
    .toBuffer(),
  "android-icon-background.png"
);
// Themed icons get re-coloured flat by the launcher, so a solid silhouette
// would lose the face entirely. Knock the eyes and mouth out instead.
const monoScale = (ANDROID_FILL * 1000) / ROBOT_W;
const monoX = (1000 - ANDROID_FILL * 1000) / 2 - ROBOT_X * monoScale;
const monoY = (1000 - ROBOT_H * monoScale) / 2;
await write(
  await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1000 1000">
      <mask id="m">
        <rect width="1000" height="1000" fill="#000"/>
        <g transform="translate(${monoX.toFixed(2)} ${monoY.toFixed(2)}) scale(${monoScale.toFixed(4)})">
          ${monoShapes()}
        </g>
      </mask>
      <rect width="1000" height="1000" fill="#fff" mask="url(#m)"/>
    </svg>`)
  )
    .png()
    .toBuffer(),
  "android-icon-monochrome.png"
);

// --- Splash and web -------------------------------------------------------
// The splash asset sits on a light ground, so the robot runs in green here.
await write(await markOnly(1024, { body: GREEN, eye: "#2aa9a2", trim: GOLD, fill: 0.6 }), "splash-icon.png");
await write(await tile(48), "favicon.png");

// --- In-app header --------------------------------------------------------
// A miniature of the home-screen icon, so the app's own chrome matches what the
// user tapped. 256px covers @3x at the ~44pt it renders at.
await write(await rounded(await tile(256), 256, 58), "logo-emblem.png");

// --- Store listings -------------------------------------------------------
// Not bundled into the app; uploaded in App Store Connect / the Play Console.
await write(await tile(512), "play-store", "icon-512.png");

const featureIcon = await rounded(await tile(300), 300, 68);
await write(
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">${gradient(1024, 500, GREEN_LIGHT, GREEN_DARK)}</svg>`
    )
  )
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
