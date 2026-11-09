import type { Item } from '../../items/entities/item.entity.js';
import type { Location } from '../../locations/entities/location.entity.js';

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'from',
  'by',
  'is',
  'was',
  'it',
  'my',
  'this',
  'that',
  'near',
  'around',
  'lost',
  'found',
  'item',
  'please',
  'contact',
]);

export interface ComputedMatchScores {
  textScore: number;
  imageScore: number;
  locationScore: number;
  timeScore: number;
  finalScore: number;
}

export function round4(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return Number(clamped.toFixed(4));
}

export function tokenizeText(input?: string | null): string[] {
  if (!input) return [];
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map((token) => (token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token));
}

function jaccardAndContainment(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection++;
    }
  }

  if (intersection === 0) return 0;

  const union = new Set([...setA, ...setB]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(setA.size, setB.size);

  return 0.55 * jaccard + 0.45 * containment;
}

function stringFuzzySimilarity(a?: string | null, b?: string | null): number {
  const normA = a?.trim().toLowerCase() ?? '';
  const normB = b?.trim().toLowerCase() ?? '';
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;
  return jaccardAndContainment(tokenizeText(normA), tokenizeText(normB));
}

export function computeTextScore(lostItem: Item, foundItem: Item): number {
  const lostTitleTokens = tokenizeText(lostItem.title);
  const foundTitleTokens = tokenizeText(foundItem.title);
  const titleSimilarity = jaccardAndContainment(lostTitleTokens, foundTitleTokens);

  const lostBodyTokens = tokenizeText(
    `${lostItem.title} ${lostItem.description} ${lostItem.specificLocationDetails ?? ''}`,
  );
  const foundBodyTokens = tokenizeText(
    `${foundItem.title} ${foundItem.description} ${foundItem.specificLocationDetails ?? ''}`,
  );
  const bodySimilarity = jaccardAndContainment(lostBodyTokens, foundBodyTokens);

  let weightedSum = 0;
  let activeWeight = 0;

  // Title + Description carry 0.70 base share
  weightedSum += 0.45 * titleSimilarity + 0.25 * bodySimilarity;
  activeWeight += 0.7;

  // Category carries 0.12 share
  const categoryScore = lostItem.categoryId === foundItem.categoryId ? 1 : 0;
  weightedSum += 0.12 * categoryScore;
  activeWeight += 0.12;

  // Brand carries 0.10 share when present on at least one report
  if (lostItem.brand?.trim() && foundItem.brand?.trim()) {
    const brandScore = stringFuzzySimilarity(lostItem.brand, foundItem.brand);
    weightedSum += 0.1 * brandScore;
    activeWeight += 0.1;
  }

  // Color carries 0.08 share when present on both reports
  if (lostItem.color?.trim() && foundItem.color?.trim()) {
    const colorScore = stringFuzzySimilarity(lostItem.color, foundItem.color);
    weightedSum += 0.08 * colorScore;
    activeWeight += 0.08;
  }

  return round4(activeWeight > 0 ? weightedSum / activeWeight : 0);
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function sameText(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

export function computeLocationScore(lostItem: Item, foundItem: Item): number {
  if (lostItem.locationId === foundItem.locationId) {
    return 1;
  }

  const lostLoc: Location | undefined = lostItem.location;
  const foundLoc: Location | undefined = foundItem.location;

  let hierarchyScore = 0;
  if (lostLoc && foundLoc) {
    if (
      sameText(lostLoc.province, foundLoc.province) &&
      sameText(lostLoc.district, foundLoc.district) &&
      sameText(lostLoc.municipality, foundLoc.municipality)
    ) {
      hierarchyScore = sameText(lostLoc.area, foundLoc.area) ? 0.95 : 0.85;
    } else if (
      sameText(lostLoc.province, foundLoc.province) &&
      sameText(lostLoc.district, foundLoc.district)
    ) {
      hierarchyScore = 0.65;
    } else if (sameText(lostLoc.province, foundLoc.province)) {
      hierarchyScore = 0.3;
    } else {
      hierarchyScore = 0.05;
    }
  }

  let geoScore = 0;
  if (
    lostLoc?.latitude != null &&
    lostLoc?.longitude != null &&
    foundLoc?.latitude != null &&
    foundLoc?.longitude != null
  ) {
    const distanceKm = haversineDistanceKm(
      Number(lostLoc.latitude),
      Number(lostLoc.longitude),
      Number(foundLoc.latitude),
      Number(foundLoc.longitude),
    );
    geoScore = Math.exp(-distanceKm / 12);
  }

  const landmarkBonus =
    0.08 *
    jaccardAndContainment(
      tokenizeText(lostItem.specificLocationDetails),
      tokenizeText(foundItem.specificLocationDetails),
    );

  const baseScore =
    geoScore > 0
      ? Math.max(hierarchyScore, 0.45 * hierarchyScore + 0.55 * geoScore)
      : hierarchyScore;

  return round4(baseScore + landmarkBonus);
}

export function computeTimeScore(lostDate: Date, foundDate: Date): number {
  const lostMs = new Date(lostDate).getTime();
  const foundMs = new Date(foundDate).getTime();
  if (Number.isNaN(lostMs) || Number.isNaN(foundMs)) {
    return 0.5;
  }

  const diffHours = (foundMs - lostMs) / (1000 * 60 * 60);

  // If item was reported found significantly earlier than when user reported losing it
  if (diffHours < -48) {
    const daysEarly = Math.abs(diffHours + 48) / 24;
    return round4(0.15 * Math.exp(-daysEarly / 14));
  }

  const diffDays = Math.abs(diffHours) / 24;
  return round4(Math.exp(-diffDays / 21));
}

export function computeMatchScores(
  lostItem: Item,
  foundItem: Item,
  imageResult: { imageScore: number; hasComparableImages: boolean },
): ComputedMatchScores {
  const textScore = computeTextScore(lostItem, foundItem);
  const locationScore = computeLocationScore(lostItem, foundItem);
  const timeScore = computeTimeScore(
    lostItem.dateLostOrFound,
    foundItem.dateLostOrFound,
  );
  const imageScore = round4(imageResult.imageScore);

  const finalScore = imageResult.hasComparableImages
    ? round4(
        0.4 * textScore +
          0.25 * imageScore +
          0.2 * locationScore +
          0.15 * timeScore,
      )
    : round4((0.4 * textScore + 0.2 * locationScore + 0.15 * timeScore) / 0.75);

  return {
    textScore,
    imageScore,
    locationScore,
    timeScore,
    finalScore,
  };
}
