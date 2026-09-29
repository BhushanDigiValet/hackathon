import { computeMatch, MatchLookups } from './match-score';

const lookups: MatchLookups = {
  atmospheres: new Map([
    [1, 'Relaxed'],
    [2, 'Indulgent'],
    [4, 'Romantic'],
  ]),
  cadences: new Map([
    [1, 'Slow'],
    [2, 'Balanced'],
    [3, 'Packed'],
  ]),
  travelCompanies: new Map([
    [1, 'Just me'],
    [2, 'With my partner'],
  ]),
};

describe('computeMatch', () => {
  it('scores identical preferences as 100%', () => {
    const prefs = {
      atmosphereMoodIds: [1, 2],
      itineraryCadenceId: 1,
      travelCompanyId: 2,
      budgetTier: 'Tier 3 - Luxury',
    };
    const result = computeMatch(prefs, { ...prefs }, lookups);
    expect(result.matchPercent).toBe(100);
    expect(result.breakdown).toHaveLength(4);
    expect(result.reasons).toContain('You both chose Relaxed, Indulgent');
  });

  it('gives partial credit for overlapping moods and adjacent pace/budget', () => {
    const result = computeMatch(
      {
        atmosphereMoodIds: [1, 2],
        itineraryCadenceId: 1,
        travelCompanyId: 2,
        budgetTier: 3,
      },
      {
        atmosphereMoodIds: [2, 4],
        itineraryCadenceId: 2,
        travelCompanyId: 1,
        budgetTier: 'Tier 4 - Unrestricted',
      },
      lookups,
    );
    const byKey = Object.fromEntries(
      result.breakdown.map((k) => [k.key, k.percent]),
    );
    expect(byKey).toEqual({
      atmosphere: 33,
      pace: 50,
      travelCompany: 0,
      budget: 50,
    });
    // (40*0.33 + 20*0.5 + 15*0 + 15*0.5) / 90
    expect(result.matchPercent).toBe(34);
  });

  it('skips keys missing on either side instead of penalising', () => {
    const result = computeMatch(
      { itineraryCadenceId: 2 },
      { itineraryCadenceId: 2, atmosphereMoodIds: [1] },
      lookups,
    );
    expect(result.breakdown.map((k) => k.key)).toEqual(['pace']);
    expect(result.matchPercent).toBe(100);
  });

  it('returns 0 when nothing is comparable', () => {
    expect(computeMatch({}, undefined, lookups).matchPercent).toBe(0);
  });
});
