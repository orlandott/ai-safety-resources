#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const resourcesPath = path.join(workspaceRoot, "public", "resources.js");
const guardrailsConfigPath = path.join(
  workspaceRoot,
  "public",
  "resource-guardrails-config.js"
);

const shouldUpdateConfig = process.argv.includes("--update-config");
const allowHardBroken = process.argv.includes("--allow-hard-broken");

const HARD_BROKEN_STATUSES = new Set([404, 410, 451]);
const RETRYABLE_METHOD_STATUSES = new Set([400, 403, 405, 429]);
const BOT_BLOCK_STATUSES = new Set([403, 429]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeTitle = (title = "") =>
  title
    .toString()
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/&/g, " and ")
    .replaceAll(/\((18|19|20)\d{2}\)/g, " ")
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();

const titleAliasLookup = {
  "the precipice chapter on ai": "the precipice",
  "general intelligence from ai services": "reframing superintelligence",
  "harry potter and the methods of rationality 1 of 6":
    "harry potter and the methods of rationality",
  "the dark forest 2 of three body problem": "the dark forest",
};

const getTitleKey = (title = "") => {
  const normalized = normalizeTitle(title);
  return titleAliasLookup[normalized] || normalized;
};

const readBooks = () => {
  const source = fs.readFileSync(resourcesPath, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `${source}
globalThis.__BOOK_ARRAYS__ = {
  first_entry: typeof first_entry !== "undefined" ? first_entry : [],
  ml: typeof ml !== "undefined" ? ml : [],
  ais: typeof ais !== "undefined" ? ais : [],
  scifi: typeof scifi !== "undefined" ? scifi : [],
  additional_resources: typeof additional_resources !== "undefined" ? additional_resources : [],
  categorized_resources: typeof categorized_resources !== "undefined" ? categorized_resources : [],
};`,
    sandbox
  );

  return sandbox.__BOOK_ARRAYS__;
};

const readGuardrailsConfig = () => {
  if (!fs.existsSync(guardrailsConfigPath)) {
    return { disabledTitles: [], disabledLinks: [] };
  }

  const source = fs.readFileSync(guardrailsConfigPath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const raw = sandbox.window.RWWC_RESOURCE_GUARDRAILS || {};

  return {
    disabledTitles: Array.isArray(raw.disabledTitles) ? raw.disabledTitles : [],
    disabledLinks: Array.isArray(raw.disabledLinks) ? raw.disabledLinks : [],
  };
};

const writeGuardrailsConfig = (config) => {
  const content = `// Optional runtime guardrails for temporarily disabling broken resources.
// Titles are matched by normalized title lookup keys.
window.RWWC_RESOURCE_GUARDRAILS = ${JSON.stringify(config, null, 2)};
`;
  fs.writeFileSync(guardrailsConfigPath, content, "utf8");
};

const dedupeEntriesByTitle = (bookArrays) => {
  const orderedArrays = [
    bookArrays.first_entry,
    bookArrays.ml,
    bookArrays.ais,
    bookArrays.scifi,
    bookArrays.additional_resources,
    bookArrays.categorized_resources,
  ];

  const byTitleKey = new Map();
  for (const list of orderedArrays) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const entry of list) {
      if (!entry || !entry.Name) {
        continue;
      }
      const key = getTitleKey(entry.Name);
      if (!key || byTitleKey.has(key)) {
        continue;
      }
      byTitleKey.set(key, entry);
    }
  }

  return [...byTitleKey.values()];
};

const isValidHttpUrl = (value = "") => {
  try {
    const url = new URL(value.toString().trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const checkLink = async (link) => {
  const trimmed = link.toString().trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    let response = await fetch(trimmed, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    if (RETRYABLE_METHOD_STATUSES.has(response.status)) {
      response = await fetch(trimmed, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
    }

    clearTimeout(timer);
    return {
      ok: response.status < 400,
      status: response.status,
      finalUrl: response.url,
      reason: "",
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      finalUrl: "",
      reason: error && error.name ? error.name : "FetchError",
    };
  }
};

const classifyResult = (entry, checkResult) => {
  const originalLink = (entry.Link || "").toString().trim();
  if (!isValidHttpUrl(originalLink)) {
    return "hard_broken";
  }

  if (checkResult.ok) {
    try {
      const original = new URL(originalLink);
      const final = new URL(checkResult.finalUrl || originalLink);
      const redirectedToRoot =
        original.pathname &&
        original.pathname !== "/" &&
        final.pathname === "/" &&
        final.search === "";
      if (redirectedToRoot) {
        return "hard_broken";
      }
    } catch (error) {
      return "hard_broken";
    }

    return "healthy";
  }

  if (HARD_BROKEN_STATUSES.has(checkResult.status)) {
    return "hard_broken";
  }

  if (BOT_BLOCK_STATUSES.has(checkResult.status) || checkResult.status === 0) {
    return "unverifiable";
  }

  return "soft_broken";
};

const main = async () => {
  if (!fs.existsSync(resourcesPath)) {
    console.error(`resources.js not found at ${resourcesPath}`);
    process.exit(1);
  }

  const bookArrays = readBooks();
  const entries = dedupeEntriesByTitle(bookArrays);
  const results = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const link = (entry.Link || "").toString().trim();
    const checkResult = link
      ? await checkLink(link)
      : { ok: false, status: 0, finalUrl: "", reason: "MissingLink" };
    const classification = classifyResult(entry, checkResult);

    results.push({
      name: entry.Name,
      link,
      status: checkResult.status,
      finalUrl: checkResult.finalUrl,
      reason: checkResult.reason,
      classification,
    });

    if ((index + 1) % 25 === 0) {
      console.log(`Checked ${index + 1}/${entries.length} resources`);
    }
    await sleep(120);
  }

  const hardBroken = results.filter((item) => item.classification === "hard_broken");
  const softBroken = results.filter((item) => item.classification === "soft_broken");
  const unverifiable = results.filter((item) => item.classification === "unverifiable");

  console.log("\nResource guardrails summary");
  console.log(`- Total checked: ${results.length}`);
  console.log(`- Hard broken: ${hardBroken.length}`);
  console.log(`- Soft broken: ${softBroken.length}`);
  console.log(`- Unverifiable (bot blocks/timeouts): ${unverifiable.length}`);

  if (hardBroken.length) {
    console.log("\nHard-broken resources:");
    for (const item of hardBroken) {
      console.log(
        `- ${item.name} :: ${item.link} (status=${item.status || "n/a"} reason=${item.reason || "none"})`
      );
    }
  }

  if (shouldUpdateConfig) {
    const existing = readGuardrailsConfig();
    const mergedTitles = new Set(existing.disabledTitles);
    const mergedLinks = new Set(existing.disabledLinks);

    for (const item of hardBroken) {
      if (item.name) {
        mergedTitles.add(item.name);
      }
      if (item.link) {
        mergedLinks.add(item.link);
      }
    }

    writeGuardrailsConfig({
      disabledTitles: [...mergedTitles].sort((left, right) => left.localeCompare(right)),
      disabledLinks: [...mergedLinks].sort((left, right) => left.localeCompare(right)),
    });
    console.log(
      `\nUpdated ${path.relative(workspaceRoot, guardrailsConfigPath)} with hard-broken resources.`
    );
  }

  if (hardBroken.length && !allowHardBroken) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("Resource guardrails failed:", error);
  process.exit(1);
});
