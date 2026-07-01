// Resource metadata lookup, shared by the ratings and recommendations
// Functions. `Link` is the stable, already-deduplicated identifier for a
// resource (see scripts/build.mjs's duplicate-link check), so it doubles as
// the resource key ratings are stored under.
import dataset from "../../data/resources.json";

let byLink = null;

function index() {
  if (!byLink) {
    byLink = new Map();
    for (const entry of dataset.resources || []) {
      if (entry && entry.Link) {
        byLink.set(entry.Link, entry);
      }
    }
  }
  return byLink;
}

export function getAllResources() {
  return dataset.resources || [];
}

export function getResourceByLink(link) {
  return index().get(link) || null;
}

export function isKnownResourceLink(link) {
  return index().has(link);
}
