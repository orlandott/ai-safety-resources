// Generates App Store and Play Store screenshots from the app's web build.
//
// Run from mobile/: `npm run screenshots`
//
// It boots `expo start --web`, seeds a half-finished library into localStorage
// so the shelves, ratings, notes, and progress stats have something to show,
// drives the real app with Playwright at each store's exact pixel dimensions,
// and writes PNGs to:
//   assets/app-store/iphone-6.9/   (1290x2796, required 6.9" display)
//   assets/app-store/iphone-6.5/   (1242x2688, required 6.5" display)
//   assets/play-store/screenshots/ (1080x1920, 9:16 phone)
//
// Cover art (Wikimedia / Amazon / Open Library, etc.) loads over the network,
// so the machine running this needs outbound access to those hosts. Where a
// poster can't be fetched, the app's built-in typographic cover renders, same
// as it does offline on device.
//
// Env:
//   SCREENSHOT_URL   use an already-running web server instead of spawning one
//   PW_CHROMIUM_PATH override the Chromium executable Playwright launches

import { spawn } from "node:child_process";
import { get } from "node:http";
import { mkdir, rm, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, "..");
const PORT = 8081;

// Content is derived from the bundled dataset so the script never drifts when
// resources change.
const data = JSON.parse(
  await readFile(join(mobileRoot, "src", "data", "app-data.json"), "utf8")
);
const firstPath = data.paths[0];

// A plausible half-finished library, so the shots show the app doing its job:
// progress bars filled in, ratings and a note on the finished shelf, one thing
// in progress, and a month's worth of finishes for the Progress screen.
const NOTES = [
  "The instrumental-convergence argument is the part I keep coming back to.",
  "Worth rewatching before arguing about timelines with anyone.",
  "Good on the mechanics, thin on what to actually do about it.",
];
const RATINGS = [5, 4, 5, 3, 4, 5];
const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const entries = {};
firstPath.steps.slice(0, 6).forEach((step, i) => {
  entries[step.resourceId] = {
    shelf: "finished",
    rating: RATINGS[i % RATINGS.length],
    note: NOTES[i] ?? "",
    addedAt: now - (20 - i) * DAY,
    // Inside the current month, so "This month" isn't empty.
    finishedAt: now - (6 - i) * DAY,
  };
});
for (const step of firstPath.steps.slice(6, 7)) {
  entries[step.resourceId] = {
    shelf: "reading",
    rating: 0,
    note: "",
    addedAt: now - 2 * DAY,
    finishedAt: null,
  };
}
firstPath.steps.slice(7, 10).forEach((step, i) => {
  entries[step.resourceId] = {
    shelf: "want",
    rating: 0,
    note: "",
    addedAt: now - i * DAY,
    finishedAt: null,
  };
});
const SEED = JSON.stringify({ entries, goal: 8 });

// The detail shot should show a resource that carries a rating and a note.
const NOTED_ID = firstPath.steps[0].resourceId;
// TV / documentaries have the most reliable poster art, so the category screen
// shows a wall of covers; fall back to the first track if absent.
const CATEGORY_LABEL =
  (data.tracks.find((t) => t.key === "tv") ?? data.tracks[0]).label;
// The detail screen is richest on something already on a shelf, so it shows the
// shelf picker, stars, and note filled in.
const DETAIL =
  data.resources.find((r) => r.id === NOTED_ID) ?? data.resources.find((r) => r.summary);
// A query whose results are poster-heavy, so the search screen shows cover art.
const SEARCH_QUERY = "android";

// deviceScaleFactor makes viewport*dsf == the store's required pixel size.
const DEVICES = [
  { key: "app-store/iphone-6.9", w: 430, h: 932, dsf: 3 }, // 1290 x 2796
  { key: "app-store/iphone-6.5", w: 414, h: 896, dsf: 3 }, // 1242 x 2688
  { key: "play-store/screenshots", w: 360, h: 640, dsf: 3 }, // 1080 x 1920
];

function waitForServer(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve();
        retry();
      });
      req.on("error", retry);
      req.setTimeout(4000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error(`server not ready: ${url}`));
      setTimeout(tick, 1000);
    };
    tick();
  });
}

async function startExpo() {
  // detached: spawn in its own process group so we can tear the whole tree
  // (npx → expo → metro) down at the end, not just the npx wrapper.
  const child = spawn("npx", ["expo", "start", "--web", "--port", String(PORT)], {
    cwd: mobileRoot,
    env: { ...process.env, CI: "1", BROWSER: "none" },
    stdio: "ignore",
    detached: true,
  });
  await waitForServer(`http://localhost:${PORT}`);
  return child;
}

function stopExpo(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

async function settleImages(page) {
  // Wait for every <img> to finish (loaded or errored → typographic fallback).
  await page
    .waitForFunction(() => Array.from(document.images).every((i) => i.complete), {
      timeout: 12000,
    })
    .catch(() => {});
  await page.waitForTimeout(1200);
}

let browser;

async function newPage(dev, scheme) {
  const ctx = await browser.newContext({
    viewport: { width: dev.w, height: dev.h },
    deviceScaleFactor: dev.dsf,
    colorScheme: scheme,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await ctx.addInitScript((seed) => {
    try {
      localStorage.setItem("ai-safety-resources/library/v2", seed);
    } catch {}
  }, SEED);
  return { ctx, page: await ctx.newPage() };
}

async function home(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByText("Where do I start?").first().waitFor({ timeout: 45000 });
  await settleImages(page);
}

async function shot(page, dir, name) {
  await page.addStyleTag({
    content: "*{outline:none !important;caret-color:transparent !important;}",
  });
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(dir, `${name}.png`) });
  console.log(`  ✓ ${join(dir, name)}.png`);
}

async function capture(url) {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars"],
  });

  for (const dev of DEVICES) {
    const dir = join(mobileRoot, "assets", ...dev.key.split("/"));
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    console.log(`\n== ${dev.key} (${dev.w * dev.dsf}x${dev.h * dev.dsf}) ==`);

    // 1. Explore, with on-device suggestions at the top
    {
      const { ctx, page } = await newPage(dev, "light");
      await home(page, url);
      await shot(page, dir, "01-explore");
      await ctx.close();
    }
    // 2. Learning path with progress
    {
      const { ctx, page } = await newPage(dev, "light");
      await home(page, url);
      await page.getByText(firstPath.title, { exact: true }).first().click();
      // Home renders the same counts on its path cards, now hidden behind this
      // screen, so match only what is actually on screen.
      await page
        .getByText(/^\d+\/\d+$/)
        .filter({ visible: true })
        .first()
        .waitFor({ timeout: 15000 });
      await settleImages(page);
      await shot(page, dir, "02-learning-path");
      await ctx.close();
    }
    // 3. The library, on the finished shelf, showing ratings and notes
    {
      const { ctx, page } = await newPage(dev, "light");
      await home(page, url);
      await page.getByText("Library", { exact: true }).first().click();
      await page.getByText("Your library", { exact: true }).waitFor({ timeout: 15000 });
      await page.getByText(/Finished \(\d+\)/).first().click();
      await settleImages(page);
      await shot(page, dir, "03-library");
      await ctx.close();
    }
    // 4. Progress: stats, goal, and per-path completion
    {
      const { ctx, page } = await newPage(dev, "light");
      await home(page, url);
      await page.getByText("Progress", { exact: true }).first().click();
      await page.getByText("Your progress", { exact: true }).waitFor({ timeout: 15000 });
      await page.waitForTimeout(600);
      await shot(page, dir, "04-progress");
      await ctx.close();
    }
    // 5. Resource detail, scrolled to the shelf / rating / notes controls
    if (DETAIL) {
      const { ctx, page } = await newPage(dev, "light");
      await home(page, url);
      await page.getByText("Search", { exact: true }).first().click();
      await page.waitForTimeout(400);
      await page.getByPlaceholder(/Search titles/).first().fill(DETAIL.name);
      await page.waitForTimeout(800);
      await page.getByText(DETAIL.name, { exact: false }).first().click();
      await page.getByText("Your shelf", { exact: true }).waitFor({ timeout: 15000 });
      await settleImages(page);
      // Bring the native controls into frame rather than the poster.
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(700);
      await shot(page, dir, "05-detail");
      await ctx.close();
    }
    // 6. Search with the time-budget filter
    {
      const { ctx, page } = await newPage(dev, "light");
      await home(page, url);
      await page.getByText("Search", { exact: true }).first().click();
      await page.waitForTimeout(400);
      await page.getByPlaceholder(/Search titles/).first().fill(SEARCH_QUERY);
      await page.waitForTimeout(400);
      // Show the time-budget filter alongside the query.
      await page.getByText("\u2264 3 hr", { exact: true }).first().click();
      await settleImages(page);
      await shot(page, dir, "06-search");
      await ctx.close();
    }
    // 7. Category list with level filters
    {
      const { ctx, page } = await newPage(dev, "light");
      await home(page, url);
      await page.getByText(CATEGORY_LABEL, { exact: true }).first().click();
      await page.getByText(/All \(\d+\)/).first().waitFor({ timeout: 15000 });
      await settleImages(page);
      await shot(page, dir, "07-category");
      await ctx.close();
    }
    // 8. Dark mode (Explore)
    {
      const { ctx, page } = await newPage(dev, "dark");
      await home(page, url);
      await shot(page, dir, "08-explore-dark");
      await ctx.close();
    }
  }

  await browser.close();
}

let expo;
try {
  const url = process.env.SCREENSHOT_URL || `http://localhost:${PORT}`;
  if (!process.env.SCREENSHOT_URL) {
    console.log("Starting Expo web server…");
    expo = await startExpo();
  }
  await capture(url);
  console.log("\nDone.");
} finally {
  if (browser) await browser.close().catch(() => {});
  if (expo) stopExpo(expo);
}
