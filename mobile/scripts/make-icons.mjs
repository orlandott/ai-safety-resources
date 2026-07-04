// Regenerates the app icon set in assets/ from the site logo
// (public/images/logo-ai-safety-resources.png). The wordmark under the emblem
// is illegible at icon size, so icons use just the emblem on the site's cream
// background. Run from mobile/: `node scripts/make-icons.mjs`.
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const logoPath = join(here, "..", "..", "public", "images", "logo-ai-safety-resources.png");
const assets = join(here, "..", "assets");

const CREAM = "#f4f1ea";

// Emblem only: the logo is 677x369 with the wordmark in the bottom ~35%.
// Two passes: sharp applies trim before extract within one pipeline.
const emblemArea = await sharp(logoPath)
  .extract({ left: 0, top: 0, width: 677, height: 250 })
  .toBuffer();
const emblem = await sharp(emblemArea).trim().toBuffer();

async function emblemResized(width) {
  return sharp(emblem).resize({ width }).png().toBuffer();
}

async function centerOn(size, background, contentWidth, out) {
  const content = await emblemResized(contentWidth);
  const meta = await sharp(content).metadata();
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([
      {
        input: content,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png()
    .toFile(join(assets, out));
  console.log(`wrote assets/${out}`);
}

// App icon: opaque (iOS requires no alpha), emblem at ~72% width.
await centerOn(1024, CREAM, 740, "icon.png");

// Splash icon: emblem on transparent, generous margins.
await centerOn(1024, { r: 0, g: 0, b: 0, alpha: 0 }, 620, "splash-icon.png");

// Android adaptive icons: the outer ~25% of the canvas may be masked away,
// so keep the emblem inside the safe zone.
await centerOn(1024, { r: 0, g: 0, b: 0, alpha: 0 }, 560, "android-icon-foreground.png");
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: CREAM } })
  .png()
  .toFile(join(assets, "android-icon-background.png"));
console.log("wrote assets/android-icon-background.png");

const mono = await sharp(await emblemResized(560)).grayscale().toBuffer();
const monoMeta = await sharp(mono).metadata();
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: mono,
      left: Math.round((1024 - monoMeta.width) / 2),
      top: Math.round((1024 - monoMeta.height) / 2),
    },
  ])
  .png()
  .toFile(join(assets, "android-icon-monochrome.png"));
console.log("wrote assets/android-icon-monochrome.png");

// Favicon for the web build.
await centerOn(48, CREAM, 40, "favicon.png");

// Google Play listing assets (not bundled into the app; uploaded in the
// Play Console): a 512x512 hi-res icon and a 1024x500 feature graphic.
// The feature graphic is wide enough for the full logo, wordmark included.
const playDir = join(assets, "play-store");
await mkdir(playDir, { recursive: true });

await centerOn(512, CREAM, 370, join("play-store", "icon-512.png"));

const fullLogo = await sharp(logoPath).trim().resize({ height: 380 }).png().toBuffer();
const logoMeta = await sharp(fullLogo).metadata();
await sharp({ create: { width: 1024, height: 500, channels: 4, background: CREAM } })
  .composite([
    {
      input: fullLogo,
      left: Math.round((1024 - logoMeta.width) / 2),
      top: Math.round((500 - logoMeta.height) / 2),
    },
  ])
  .png()
  .toFile(join(playDir, "feature-graphic.png"));
console.log("wrote assets/play-store/feature-graphic.png");
