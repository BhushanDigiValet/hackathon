/**
 * Preference matching between two guests for the Guest Circles feed.
 *
 * Each preference key contributes a weighted score. Keys where either guest
 * has no data are skipped and the result is normalised over the remaining
 * weight, so sparse profiles aren't unfairly penalised.
 */

export interface MatchLookups {
  atmospheres: Map<number, string>;
  cadences: Map<number, string>;
  travelCompanies: Map<number, string>;
}

export interface MatchKeyResult {
  key: 'atmosphere' | 'pace' | 'travelCompany' | 'budget' | 'interests';
  label: string;
  /** Share of the total score this key is worth (0-100) */
  weight: number;
  /** How well this key matched (0-100) */
  percent: number;
  /** Human-readable explanation, e.g. 'You both chose Relaxed, Romantic' */
  detail: string;
}

export interface MatchResult {
  /** Overall weighted match (0-100) */
  matchPercent: number;
  /** Per-key breakdown, only for keys both guests have data for */
  breakdown: MatchKeyResult[];
  /** Short reasons for keys that matched at least 50% */
  reasons: string[];
}

const WEIGHTS = {
  atmosphere: 40,
  pace: 20,
  travelCompany: 15,
  budget: 15,
  interests: 10,
};

const jaccard = <T>(a: T[], b: T[]) => {
  const setA = new Set(a);
  const setB = new Set(b);
  const shared = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return { shared, ratio: union.size ? shared.length / union.size : 0 };
};

/** Accepts 3, '3' or 'Tier 3 - Luxury' */
const parseBudgetTier = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) return Number(match[0]);
  }
  return undefined;
};

const numberList = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(Number).filter((n) => !isNaN(n)) : [];

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((s) => String(s).toLowerCase()) : [];

const toPercent = (ratio: number) => Math.round(ratio * 100);

export function computeMatch(
  mine: any,
  theirs: any,
  lookups: MatchLookups,
): MatchResult {
  mine = mine || {};
  theirs = theirs || {};
  const breakdown: MatchKeyResult[] = [];

  // Atmosphere & mood: overlap of selected mood ids
  const myMoods = numberList(mine.atmosphereMoodIds);
  const theirMoods = numberList(theirs.atmosphereMoodIds);
  if (myMoods.length && theirMoods.length) {
    const { shared, ratio } = jaccard(myMoods, theirMoods);
    const names = shared.map((id) => lookups.atmospheres.get(id) || `#${id}`);
    breakdown.push({
      key: 'atmosphere',
      label: 'Atmosphere & Mood',
      weight: WEIGHTS.atmosphere,
      percent: toPercent(ratio),
      detail: names.length
        ? `You both chose ${names.join(', ')}`
        : 'Different moods',
    });
  }

  // Pace: same cadence = full, one step apart = half
  const myPace = Number(mine.itineraryCadenceId);
  const theirPace = Number(theirs.itineraryCadenceId);
  if (myPace && theirPace) {
    const gap = Math.abs(myPace - theirPace);
    const ratio = gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
    breakdown.push({
      key: 'pace',
      label: 'Itinerary Pace',
      weight: WEIGHTS.pace,
      percent: toPercent(ratio),
      detail:
        gap === 0
          ? `Same pace: ${lookups.cadences.get(myPace) || myPace}`
          : gap === 1
            ? `Similar pace: ${lookups.cadences.get(theirPace) || theirPace}`
            : `Different pace: ${lookups.cadences.get(theirPace) || theirPace}`,
    });
  }

  // Travel company: exact match only
  const myCompany = Number(mine.travelCompanyId);
  const theirCompany = Number(theirs.travelCompanyId);
  if (myCompany && theirCompany) {
    const same = myCompany === theirCompany;
    breakdown.push({
      key: 'travelCompany',
      label: 'Travel Company',
      weight: WEIGHTS.travelCompany,
      percent: same ? 100 : 0,
      detail: `${same ? 'Same travel company' : 'Travelling'}: ${
        lookups.travelCompanies.get(theirCompany) || theirCompany
      }`,
    });
  }

  // Budget tier: same = full, adjacent = half
  const myBudget = parseBudgetTier(mine.budgetTier);
  const theirBudget = parseBudgetTier(theirs.budgetTier);
  if (myBudget && theirBudget) {
    const gap = Math.abs(myBudget - theirBudget);
    const ratio = gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
    breakdown.push({
      key: 'budget',
      label: 'Budget Tier',
      weight: WEIGHTS.budget,
      percent: toPercent(ratio),
      detail:
        gap === 0
          ? `Same budget tier: Tier ${theirBudget}`
          : gap === 1
            ? `Similar budget tier: Tier ${theirBudget}`
            : `Different budget tier: Tier ${theirBudget}`,
    });
  }

  // Interests: overlap of AI-extracted tags
  const myTags = stringList(mine.tags);
  const theirTags = stringList(theirs.tags);
  if (myTags.length && theirTags.length) {
    const { shared, ratio } = jaccard(myTags, theirTags);
    breakdown.push({
      key: 'interests',
      label: 'Interests',
      weight: WEIGHTS.interests,
      percent: toPercent(ratio),
      detail: shared.length
        ? `Shared interests: ${shared.map((t) => t.replace(/_/g, ' ')).join(', ')}`
        : 'Different interests',
    });
  }

  const totalWeight = breakdown.reduce((sum, k) => sum + k.weight, 0);
  const earned = breakdown.reduce(
    (sum, k) => sum + (k.weight * k.percent) / 100,
    0,
  );

  return {
    matchPercent: totalWeight ? Math.round((earned / totalWeight) * 100) : 0,
    breakdown,
    reasons: breakdown.filter((k) => k.percent >= 50).map((k) => k.detail),
  };
}
