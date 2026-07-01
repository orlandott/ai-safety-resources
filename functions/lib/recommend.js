// Hybrid recommender: item-based collaborative filtering with a fallback
// chain for the cold-start case (see docs/ratings-recommendations.md).
//
// Tiers, in order, each filling whatever slots the previous tier couldn't:
//   1. collaborative — adjusted-cosine item-item similarity over shared
//      raters. Needs at least MIN_COMMON_RATERS users who rated both the
//      seed and the candidate, so it naturally stays silent while the
//      ratings matrix is too sparse to trust.
//   2. content       — shared tags/category/author with the seed resource(s),
//      using metadata that exists independently of any ratings.
//   3. popularity     — highest average stars site-wide, once *some* ratings
//      exist anywhere, even if none overlap with this seed.
//   4. diverse        — round-robins one resource per track by recency; the
//      only tier that works with a completely empty ratings table.
const MIN_COMMON_RATERS = 2;

function buildRatingMaps(ratingsRows) {
  const resourceRaters = new Map();
  const userRatings = new Map();
  for (const row of ratingsRows) {
    if (!resourceRaters.has(row.resource_link)) {
      resourceRaters.set(row.resource_link, new Map());
    }
    resourceRaters.get(row.resource_link).set(row.user_id, row.stars);

    if (!userRatings.has(row.user_id)) {
      userRatings.set(row.user_id, new Map());
    }
    userRatings.get(row.user_id).set(row.resource_link, row.stars);
  }
  return { resourceRaters, userRatings };
}

function buildUserMeans(userRatings) {
  const means = new Map();
  for (const [userId, ratings] of userRatings) {
    const values = [...ratings.values()];
    means.set(userId, values.reduce((sum, v) => sum + v, 0) / values.length);
  }
  return means;
}

// Adjusted cosine similarity: mean-center each user's ratings first so a
// generous rater and a stingy rater who agree on relative preference still
// score as similar.
function itemSimilarity(linkA, linkB, resourceRaters, userMeans) {
  const ratersA = resourceRaters.get(linkA);
  const ratersB = resourceRaters.get(linkB);
  if (!ratersA || !ratersB) {
    return { score: 0, overlap: 0 };
  }
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  let overlap = 0;
  for (const [userId, ratingA] of ratersA) {
    if (!ratersB.has(userId)) continue;
    overlap += 1;
    const ratingB = ratersB.get(userId);
    const mean = userMeans.get(userId) || 0;
    const deviationA = ratingA - mean;
    const deviationB = ratingB - mean;
    numerator += deviationA * deviationB;
    denomA += deviationA * deviationA;
    denomB += deviationB * deviationB;
  }
  if (overlap < MIN_COMMON_RATERS || denomA === 0 || denomB === 0) {
    return { score: 0, overlap };
  }
  return { score: numerator / (Math.sqrt(denomA) * Math.sqrt(denomB)), overlap };
}

function collaborativeCandidates(seedLinks, resourceRaters, userMeans, exclude, limit) {
  const scores = new Map();
  for (const seedLink of seedLinks) {
    if (!resourceRaters.has(seedLink)) continue;
    for (const candidateLink of resourceRaters.keys()) {
      if (candidateLink === seedLink || exclude.has(candidateLink)) continue;
      const { score } = itemSimilarity(seedLink, candidateLink, resourceRaters, userMeans);
      if (score > 0) {
        scores.set(candidateLink, (scores.get(candidateLink) || 0) + score);
      }
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([link]) => link);
}

function contentScore(seedEntry, candidateEntry) {
  let score = 0;
  const seedTags = new Set(seedEntry.tags || []);
  for (const tag of candidateEntry.tags || []) {
    if (seedTags.has(tag)) score += 1;
  }
  if (seedEntry.Category && seedEntry.Category === candidateEntry.Category) {
    score += 2;
  }
  if (seedEntry.Author && seedEntry.Author === candidateEntry.Author) {
    score += 3;
  }
  return score;
}

function contentCandidates(seedEntries, resources, exclude, limit) {
  return resources
    .filter((entry) => entry.Link && !exclude.has(entry.Link))
    .map((entry) => ({
      link: entry.Link,
      score: Math.max(...seedEntries.map((seed) => contentScore(seed, entry))),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.link.localeCompare(b.link))
    .slice(0, limit)
    .map((candidate) => candidate.link);
}

function popularityCandidates(resourceRaters, exclude, limit) {
  const scored = [];
  for (const [link, raters] of resourceRaters) {
    if (exclude.has(link)) continue;
    const stars = [...raters.values()];
    scored.push({
      link,
      average: stars.reduce((sum, v) => sum + v, 0) / stars.length,
      count: stars.length,
    });
  }
  return scored
    .sort((a, b) => b.average - a.average || b.count - a.count || a.link.localeCompare(b.link))
    .slice(0, limit)
    .map((s) => s.link);
}

// Deterministic round-robin across tracks so even a brand-new deployment
// with zero ratings ever returns a varied, non-empty list.
function diverseCandidates(resources, exclude, limit) {
  const byTrack = new Map();
  for (const entry of resources) {
    if (!entry.Link || exclude.has(entry.Link)) continue;
    const track = entry.track || entry.Category || "other";
    if (!byTrack.has(track)) byTrack.set(track, []);
    byTrack.get(track).push(entry);
  }
  for (const list of byTrack.values()) {
    list.sort((a, b) => (b.Year || 0) - (a.Year || 0) || String(a.Name).localeCompare(String(b.Name)));
  }
  const tracks = [...byTrack.keys()];
  const result = [];
  let cursor = 0;
  while (result.length < limit && tracks.some((track) => byTrack.get(track).length)) {
    const track = tracks[cursor % tracks.length];
    const list = byTrack.get(track);
    if (list.length) {
      result.push(list.shift().Link);
    }
    cursor += 1;
  }
  return result;
}

export function recommend({ ratingsRows, resources, seedLinks = [], excludeLinks = [], limit = 6 }) {
  const exclude = new Set(excludeLinks);
  seedLinks.forEach((link) => exclude.add(link));

  const byLink = new Map(resources.filter((entry) => entry.Link).map((entry) => [entry.Link, entry]));
  const { resourceRaters, userRatings } = buildRatingMaps(ratingsRows);

  const picks = [];
  const pickedLinks = new Set();
  const addPicks = (links, reason) => {
    for (const link of links) {
      if (picks.length >= limit || pickedLinks.has(link) || exclude.has(link) || !byLink.has(link)) {
        continue;
      }
      pickedLinks.add(link);
      picks.push({ link, reason });
    }
  };

  if (seedLinks.length && resourceRaters.size) {
    const userMeans = buildUserMeans(userRatings);
    addPicks(
      collaborativeCandidates(seedLinks, resourceRaters, userMeans, new Set([...exclude, ...pickedLinks]), limit),
      "collaborative"
    );
  }

  if (picks.length < limit && seedLinks.length) {
    const seedEntries = seedLinks.map((link) => byLink.get(link)).filter(Boolean);
    if (seedEntries.length) {
      addPicks(
        contentCandidates(seedEntries, resources, new Set([...exclude, ...pickedLinks]), limit - picks.length),
        "content"
      );
    }
  }

  if (picks.length < limit && resourceRaters.size) {
    addPicks(
      popularityCandidates(resourceRaters, new Set([...exclude, ...pickedLinks]), limit - picks.length),
      "popularity"
    );
  }

  if (picks.length < limit) {
    addPicks(diverseCandidates(resources, new Set([...exclude, ...pickedLinks]), limit - picks.length), "diverse");
  }

  return {
    recommendations: picks.map(({ link, reason }) => {
      const entry = byLink.get(link);
      return {
        name: entry.Name || "",
        author: entry.Author || "",
        link: entry.Link,
        category: entry.Category || "",
        summary: entry.Summary || "",
        year: entry.Year || null,
        reason,
      };
    }),
  };
}
