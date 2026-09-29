import { DemoCache } from './demo-cache';

export function seedDemoCacheData() {
  const demoCache = new DemoCache();
  process.env.DEMO_CACHE = 'record';

  // =========================================================================
  // 1. EXTRACT PROFILE TEST CASES
  // =========================================================================

  // Hero Case
  const heroPrompt =
    "I've had a crazy few months. I want this trip to feel luxurious and relaxing. Give me great food, a spa, a beautiful sunset and maybe something social tonight. I don't want to plan everything myself.";
  const heroSelections = {};
  const heroProfile = {
    mood: 'relaxed',
    pace: 'slow',
    travelMode: 'solo',
    socialOptIn: true,
    weights: {
      wellness: 0.9,
      food: 0.85,
      nightlife: 0.6,
      exploration: 0.3,
      luxury: 0.95,
      energy: 0.3,
    },
    tags: [
      'spa',
      'wellness',
      'fine_dining',
      'sunset',
      'social',
      'luxury',
      'quiet',
      'cocktails',
    ],
    constraints: {
      partySize: 1,
      wakeAfter: '09:00',
      budgetTier: 4,
      dietary: [],
      notes: 'Desires deep relaxation, luxury pampering, and a social finish.',
    },
    summary:
      'You wanted to slow down, let the crazy months melt away, and savor an unhurried, luxurious day.',
    wakeAfter: '09:00',
    budgetTier: 4,
    rawPrompt: heroPrompt,
  };
  demoCache.set(
    'extractProfile',
    { prompt: heroPrompt, selections: heroSelections },
    heroProfile,
  );

  // Case 2 (couple)
  const case2Prompt =
    'Celebrating our anniversary. Romantic, a bit fancy, we sleep late.';
  const case2Selections = { travelMode: 'couple' };
  const case2Profile = {
    mood: 'romantic',
    pace: 'slow',
    travelMode: 'couple',
    socialOptIn: false,
    weights: {
      wellness: 0.6,
      food: 0.9,
      nightlife: 0.2,
      exploration: 0.4,
      luxury: 0.85,
      energy: 0.2,
    },
    tags: ['romantic', 'fine_dining', 'luxury', 'wine', 'quiet'],
    constraints: {
      partySize: 2,
      wakeAfter: '10:00',
      budgetTier: 4,
      dietary: [],
      notes: 'Anniversary celebration sleeping late.',
    },
    summary:
      'An intimate celebration crafted around candlelit corners, exceptional cuisine, and quiet unhurried hours together.',
    wakeAfter: '10:00',
    budgetTier: 4,
    rawPrompt: case2Prompt,
  };
  demoCache.set(
    'extractProfile',
    { prompt: case2Prompt, selections: case2Selections },
    case2Profile,
  );

  // Case 3 (bachelor weekend)
  const case3Prompt =
    'Bachelor weekend with 4 friends, we want energy, golf and a big night out.';
  const case3Selections = { travelMode: 'friends', pace: 'packed' };
  const case3Profile = {
    mood: 'adventurous',
    pace: 'packed',
    travelMode: 'friends',
    socialOptIn: true,
    weights: {
      wellness: 0.2,
      food: 0.7,
      nightlife: 0.95,
      exploration: 0.6,
      luxury: 0.7,
      energy: 0.95,
    },
    tags: ['golf', 'nightlife', 'cocktails', 'social', 'lively', 'adventure'],
    constraints: {
      partySize: 4,
      wakeAfter: '09:00',
      budgetTier: 3,
      dietary: [],
      notes: 'High energy bachelor party.',
    },
    summary:
      'A high-energy weekend pairing morning golf on championship greens with buzzing dining and premier nightlife.',
    wakeAfter: '09:00',
    budgetTier: 3,
    rawPrompt: case3Prompt,
  };
  demoCache.set(
    'extractProfile',
    { prompt: case3Prompt, selections: case3Selections },
    case3Profile,
  );

  // Case 4 (work solo)
  const case4Prompt =
    'Traveling alone for work, one free evening, want good food and maybe meet people.';
  const case4Selections = { travelMode: 'solo' };
  const case4Profile = {
    mood: 'social',
    pace: 'balanced',
    travelMode: 'solo',
    socialOptIn: true,
    weights: {
      wellness: 0.3,
      food: 0.85,
      nightlife: 0.65,
      exploration: 0.5,
      luxury: 0.7,
      energy: 0.6,
    },
    tags: ['social', 'fine_dining', 'cocktails', 'lively'],
    constraints: {
      partySize: 1,
      wakeAfter: '09:00',
      budgetTier: 3,
      dietary: [],
      notes: 'Business traveler with one open evening.',
    },
    summary:
      'A welcoming evening designed to unwind from business, enjoy sublime food, and encounter friendly conversation.',
    wakeAfter: '09:00',
    budgetTier: 3,
    rawPrompt: case4Prompt,
  };
  demoCache.set(
    'extractProfile',
    { prompt: case4Prompt, selections: case4Selections },
    case4Profile,
  );

  // Case 5 (rest)
  const case5Prompt = 'Just want to rest. Pool, room service, early night.';
  const case5Selections = {};
  const case5Profile = {
    mood: 'recharge',
    pace: 'slow',
    travelMode: 'solo',
    socialOptIn: false,
    weights: {
      wellness: 0.9,
      food: 0.6,
      nightlife: 0.0,
      exploration: 0.1,
      luxury: 0.8,
      energy: 0.1,
    },
    tags: ['pool', 'wellness', 'quiet', 'casual'],
    constraints: {
      partySize: 1,
      wakeAfter: '09:00',
      budgetTier: 2,
      dietary: [],
      notes: 'Restorative quiet getaway.',
    },
    summary:
      'A peaceful sanctuary focused entirely on private relaxation by the water, effortless dining, and unbroken quiet.',
    wakeAfter: '09:00',
    budgetTier: 2,
    rawPrompt: case5Prompt,
  };
  demoCache.set(
    'extractProfile',
    { prompt: case5Prompt, selections: case5Selections },
    case5Profile,
  );

  // =========================================================================
  // 2. COMPOSE PLAN (Hero Case)
  // =========================================================================
  const heroPlanKey = {
    profileMood: heroProfile.mood,
    profilePace: heroProfile.pace,
    rawPrompt: heroProfile.rawPrompt,
    lockedIds: [],
  };

  const heroPlanData = {
    planSummary:
      'You said you wanted to slow down after a crazy few months, so your morning begins gently with a restorative spa treatment, leaving the afternoon open before sunset drinks, fine dining, and live jazz.',
    items: [
      {
        catalogueItemId: 12, // Serenity Stone Massage
        startAt: '10:30',
        endAt: '12:00',
        why: 'You mentioned needing to slow down after crazy months, and this heated river stone massage releases deep-seated tension.',
        upsellItemId: 15, // Champagne & Truffles Spa Upgrade
        upsellReason:
          'Enjoy champagne and hand-crafted truffles in the private relaxation lounge after your treatment.',
      },
      {
        catalogueItemId: 9, // Golden Hour Terrace Bar
        startAt: '18:00',
        endAt: '19:15',
        why: 'Perched high with open skyline views, this terrace is the ideal vantage to watch the desert sunset unfold.',
      },
      {
        catalogueItemId: 4, // Ember & Oak
        startAt: '19:30',
        endAt: '21:30',
        why: 'Prime cuts and wood-fired delicacies in a secluded alcove cater to your desire for an indulgent, memorable meal.',
        upsellItemId: 27, // Private Balcony Dining Upgrade
        upsellReason:
          'Reserve a private candlelit balcony table overlooking the illuminated gardens for dinner.',
      },
      {
        catalogueItemId: 22, // Midnight Jazz Sessions
        startAt: '22:00',
        endAt: '23:30',
        why: 'Live saxophone quartets and craft bourbon create the effortless social atmosphere you requested to cap off your night.',
      },
    ],
  };

  demoCache.set('composePlan', heroPlanKey, heroPlanData);

  // =========================================================================
  // 3. RESHAPE PLAN TEST CASES (Hero Plan with Sunset Item [id: 9] Locked)
  // =========================================================================
  const lockedIds = [9];

  // Reshape a: "Actually I want tonight to be more social."
  const msgA = 'Actually I want tonight to be more social.';
  const keyA = {
    message: msgA,
    profileMood: heroProfile.mood,
    lockedIds,
  };
  const dataA = {
    understood:
      'You would like tonight to carry more social energy while keeping your daytime relaxation intact.',
    changes: [
      'Late Night: Replaced Midnight Jazz with Velvet Room Club for high-energy social nightlife',
      'Kept: Golden Hour Terrace Bar (confirmed)',
    ],
    profilePatch: {
      weights: { nightlife: 0.85, energy: 0.7 },
      tags: [
        'spa',
        'wellness',
        'fine_dining',
        'sunset',
        'social',
        'nightlife',
        'lively',
      ],
    },
    items: [
      {
        catalogueItemId: 12,
        startAt: '10:30',
        endAt: '12:00',
        why: 'Your morning massage remains untouched so you begin your day fully refreshed.',
      },
      {
        catalogueItemId: 4,
        startAt: '19:30',
        endAt: '21:30',
        why: 'Dinner at Ember and Oak provides a rich, satisfying foundation before your social night out.',
      },
      {
        catalogueItemId: 21, // Velvet Room Club
        startAt: '22:00',
        endAt: '01:00',
        why: 'Premier DJs and vibrant bottle service deliver the lively social night you asked for.',
      },
    ],
  };
  demoCache.set('reshapePlan', keyA, dataA);

  // Reshape b: "I don't want to wake up before 10."
  const msgB = "I don't want to wake up before 10.";
  const keyB = {
    message: msgB,
    profileMood: heroProfile.mood,
    lockedIds,
  };
  const dataB = {
    understood:
      'You prefer to sleep in later, so we moved your morning activities to start after ten.',
    changes: [
      'Morning: Moved Serenity Stone Massage to 10:30 so you wake naturally without rush',
      'Kept: Golden Hour Terrace Bar (confirmed)',
    ],
    profilePatch: {
      constraints: { wakeAfter: '10:00' },
    },
    items: [
      {
        catalogueItemId: 12,
        startAt: '10:30',
        endAt: '12:00',
        why: 'Scheduled comfortably after ten in the morning so you wake naturally without an alarm.',
      },
      {
        catalogueItemId: 4,
        startAt: '19:30',
        endAt: '21:30',
        why: 'Evening dinner remains gracefully set following your sunset drinks.',
      },
      {
        catalogueItemId: 22,
        startAt: '22:00',
        endAt: '23:30',
        why: 'Late night jazz concludes your leisurely day with gentle, melodic charm.',
      },
    ],
  };
  demoCache.set('reshapePlan', keyB, dataB);

  // Reshape c: "Replace the expensive dinner with something more casual."
  const msgC = 'Replace the expensive dinner with something more casual.';
  const keyC = {
    message: msgC,
    profileMood: heroProfile.mood,
    lockedIds,
  };
  const dataC = {
    understood:
      'You would like a relaxed dinner atmosphere with a lighter bill instead of formal fine dining.',
    changes: [
      'Dinner: Ember & Oak → Vine Street Grill, casual wood-fired comfort food',
      'Kept: Golden Hour Terrace Bar (confirmed)',
    ],
    profilePatch: {
      constraints: { budgetTier: 2 },
      tags: ['spa', 'wellness', 'casual', 'sunset', 'social'],
    },
    items: [
      {
        catalogueItemId: 12,
        startAt: '10:30',
        endAt: '12:00',
        why: 'Your morning massage is preserved for restorative relaxation.',
      },
      {
        catalogueItemId: 7, // Vine Street Grill
        startAt: '19:30',
        endAt: '21:00',
        why: 'Fresh coastal fare and laid-back grill favorites give you great food without the formality.',
      },
      {
        catalogueItemId: 22,
        startAt: '22:00',
        endAt: '23:30',
        why: 'Unwind with late night jazz cocktails after an easygoing dinner.',
      },
    ],
  };
  demoCache.set('reshapePlan', keyC, dataC);

  // Reshape d: "Make it more adventurous."
  const msgD = 'Make it more adventurous.';
  const keyD = {
    message: msgD,
    profileMood: heroProfile.mood,
    lockedIds,
  };
  const dataD = {
    understood:
      'You would like to inject more exhilaration and exploration into your stay.',
    changes: [
      'Afternoon: Added Helicopter Sunset Tour for scenic desert exploration',
      'Kept: Golden Hour Terrace Bar (confirmed)',
    ],
    profilePatch: {
      weights: { exploration: 0.85, energy: 0.7 },
      tags: ['spa', 'adventure', 'sunset', 'social', 'fine_dining'],
    },
    items: [
      {
        catalogueItemId: 12,
        startAt: '10:30',
        endAt: '12:00',
        why: 'Begin with soothing spa therapy to center yourself for an active afternoon.',
      },
      {
        catalogueItemId: 25, // Helicopter Sunset Tour
        startAt: '15:30',
        endAt: '17:00',
        why: 'Sweeping canyon and Strip aerial views bring the exhilarating adventure you requested.',
      },
      {
        catalogueItemId: 4,
        startAt: '19:30',
        endAt: '21:30',
        why: 'Refuel after your aerial excursion with an exquisite wood-fired steak dinner.',
      },
      {
        catalogueItemId: 22,
        startAt: '22:00',
        endAt: '23:30',
        why: 'Wrap up an eventful day of discovery in the company of live jazz.',
      },
    ],
  };
  demoCache.set('reshapePlan', keyD, dataD);

  // Reshape e: "Cancel the sunset."
  const msgE = 'Cancel the sunset.';
  const keyE = {
    message: msgE,
    profileMood: heroProfile.mood,
    lockedIds,
  };
  const dataE = {
    understood:
      'Your sunset reservation at Golden Hour Terrace Bar is already confirmed, so we kept it safely in place.',
    changes: [
      'Kept: Golden Hour Terrace Bar (confirmed reservation cannot be removed conversationally)',
    ],
    profilePatch: {},
    items: [
      {
        catalogueItemId: 12,
        startAt: '10:30',
        endAt: '12:00',
        why: 'Your morning massage continues as planned.',
      },
      {
        catalogueItemId: 4,
        startAt: '19:30',
        endAt: '21:30',
        why: 'Your reserved dining table remains ready for your evening.',
      },
      {
        catalogueItemId: 22,
        startAt: '22:00',
        endAt: '23:30',
        why: 'Late night live music concludes your night as arranged.',
      },
    ],
  };
  demoCache.set('reshapePlan', keyE, dataE);

  // =========================================================================
  // 4. NARRATE MEMORY TEST CASE (Hero Day with 4 confirmed + 1 shared)
  // =========================================================================
  const timelineNames = [
    'Serenity Stone Massage',
    'Crystal Brasserie Brunch',
    'Golden Hour Terrace Bar',
    'Ember & Oak',
    'Midnight Jazz Sessions',
  ];

  const memoryKey = {
    timelineCount: 5,
    profileMood: heroProfile.mood,
    timelineNames,
  };

  const memoryData = {
    title: 'Your Vegas, slowed down',
    chapters: [
      {
        time: '10:30',
        title: 'A slower morning',
        text: 'Heated basalt and quiet cedar aromas allowed the hurry of previous weeks to softly dissolve.',
        category: 'wellness',
      },
      {
        time: '12:30',
        title: 'Sunlit brunch',
        text: 'Chilled champagne and warm brioche framed a relaxed afternoon with nowhere else you needed to be.',
        category: 'dining',
      },
      {
        time: '18:00',
        title: 'The golden hour',
        text: 'From high above the boulevard, desert amber settled into twilight as glasses were raised.',
        category: 'dining',
      },
      {
        time: '19:30',
        title: 'An intimate dinner',
        text: 'The scent of charred oak and vintage cabernet turned the evening into an unhurried feast.',
        category: 'dining',
      },
      {
        time: '22:00',
        title: 'Shared evening rhythms',
        text: 'Warm brass melodies filled the room as you shared tableside cocktails with fellow guests under soft amber light.',
        category: 'nightlife',
      },
    ],
    closingLine:
      'When you are ready to pause again, your sanctuary will be waiting.',
  };

  demoCache.set('narrateMemory', memoryKey, memoryData);

  console.log('[seed] Pre-recorded demo cache entries successfully generated.');
}

if (require.main === module) {
  seedDemoCacheData();
}
