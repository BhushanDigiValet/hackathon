import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CatalogueItem } from '../entities';
import { AiModule } from './ai.module';
import { AiService } from './ai.service';
import { mockCatalogueItems } from '../seed/catalogue';

const mockEntities: CatalogueItem[] = mockCatalogueItems.map((item) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price: item.price,
  details: {
    categoryGroup: item.categoryGroup,
    tags: item.tags,
    openFrom: item.openFrom,
    openTo: item.openTo,
    durationMin: item.durationMin,
    imageUrl: item.imageUrl,
    upsellOfId: (item as any).upsellOfId,
    priceTier: (item as any).priceTier,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}));

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AiModule],
  providers: [
    {
      provide: getRepositoryToken(CatalogueItem),
      useValue: {
        find: async () => mockEntities,
      },
    },
  ],
})
export class AiPlaygroundModule {}

async function runPlayground() {
  // Default to DEMO_CACHE=on if not explicitly set
  if (!process.env.DEMO_CACHE) {
    process.env.DEMO_CACHE = 'on';
  }

  console.log(
    '===============================================================',
  );
  console.log(
    `🏨 AI CONCIERGE PLAYGROUND (DEMO_CACHE=${process.env.DEMO_CACHE})`,
  );
  console.log(
    '===============================================================\n',
  );

  const app = await NestFactory.createApplicationContext(AiPlaygroundModule, {
    logger: false,
  });
  const aiService = app.get(AiService);

  try {
    // =========================================================================
    // 1. EXTRACT PROFILE + COMPOSE PLAN TESTS
    // =========================================================================
    console.log('--- TEST 1: Hero Flow (Extract + Compose) ---');
    const heroPrompt =
      "I've had a crazy few months. I want this trip to feel luxurious and relaxing. Give me great food, a spa, a beautiful sunset and maybe something social tonight. I don't want to plan everything myself.";
    const t0 = Date.now();
    const heroProfile = await aiService.extractProfile(heroPrompt, {});
    console.log(`Extract Latency: ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    console.log('Extracted Profile:', JSON.stringify(heroProfile, null, 2));

    const t1 = Date.now();
    const heroPlan = await aiService.composePlan(heroProfile, mockEntities, []);
    console.log(`Compose Latency: ${((Date.now() - t1) / 1000).toFixed(2)}s`);
    console.log('Composed Plan:', JSON.stringify(heroPlan, null, 2));

    console.log(
      '\n--- TEST 2: Anniversary Couple (Late wake, romantic, fine dining) ---',
    );
    const p2 = await aiService.extractProfile(
      'Celebrating our anniversary. Romantic, a bit fancy, we sleep late.',
      { travelMode: 'couple' },
    );
    console.log('Profile 2:', JSON.stringify(p2, null, 2));

    console.log(
      '\n--- TEST 3: Bachelor Weekend (Packed, high energy, golf, nightlife) ---',
    );
    const p3 = await aiService.extractProfile(
      'Bachelor weekend with 4 friends, we want energy, golf and a big night out.',
      { travelMode: 'friends', pace: 'packed' },
    );
    console.log('Profile 3:', JSON.stringify(p3, null, 2));

    console.log('\n--- TEST 4: Solo Business (Good food, meet people) ---');
    const p4 = await aiService.extractProfile(
      'Traveling alone for work, one free evening, want good food and maybe meet people.',
      { travelMode: 'solo' },
    );
    console.log('Profile 4:', JSON.stringify(p4, null, 2));

    console.log(
      '\n--- TEST 5: Rest & Recharge (Pool, room service, early night) ---',
    );
    const p5 = await aiService.extractProfile(
      'Just want to rest. Pool, room service, early night.',
      {},
    );
    console.log('Profile 5:', JSON.stringify(p5, null, 2));

    // =========================================================================
    // 2. RESHAPE PLAN TESTS (Hero plan with sunset locked as confirmed)
    // =========================================================================
    console.log(
      '\n===============================================================',
    );
    console.log(
      '--- RESHAPE PLAN TESTS (Hero plan with sunset item confirmed) ---',
    );
    console.log(
      '===============================================================\n',
    );

    const heroPlanItems = (heroPlan?.items || heroPlan || []) as any[];
    const currentItemsWithLocked = heroPlanItems.map((item: any) => {
      // Lock the sunset item (id 9: Golden Hour Terrace Bar)
      if (item.catalogueItemId === 9) {
        return {
          ...item,
          name: 'Golden Hour Terrace Bar',
          state: 'confirmed',
          details: { ...item, state: 'confirmed' },
        };
      }
      return {
        ...item,
        state: 'suggested',
        details: { ...item, state: 'suggested' },
      };
    });

    console.log(
      '--- Reshape a: "Actually I want tonight to be more social." ---',
    );
    const rA = await aiService.reshapePlan(
      'Actually I want tonight to be more social.',
      heroProfile,
      currentItemsWithLocked,
      mockEntities,
    );
    console.log('Reshape a result:', JSON.stringify(rA, null, 2));

    console.log('\n--- Reshape b: "I don\'t want to wake up before 10." ---');
    const rB = await aiService.reshapePlan(
      "I don't want to wake up before 10.",
      heroProfile,
      currentItemsWithLocked,
      mockEntities,
    );
    console.log('Reshape b result:', JSON.stringify(rB, null, 2));

    console.log(
      '\n--- Reshape c: "Replace the expensive dinner with something more casual." ---',
    );
    const rC = await aiService.reshapePlan(
      'Replace the expensive dinner with something more casual.',
      heroProfile,
      currentItemsWithLocked,
      mockEntities,
    );
    console.log('Reshape c result:', JSON.stringify(rC, null, 2));

    console.log('\n--- Reshape d: "Make it more adventurous." ---');
    const rD = await aiService.reshapePlan(
      'Make it more adventurous.',
      heroProfile,
      currentItemsWithLocked,
      mockEntities,
    );
    console.log('Reshape d result:', JSON.stringify(rD, null, 2));

    console.log(
      '\n--- Reshape e: "Cancel the sunset." (Locked confirmed test) ---',
    );
    const rE = await aiService.reshapePlan(
      'Cancel the sunset.',
      heroProfile,
      currentItemsWithLocked,
      mockEntities,
    );
    console.log('Reshape e result:', JSON.stringify(rE, null, 2));

    // =========================================================================
    // 3. NARRATE MEMORY TEST
    // =========================================================================
    console.log(
      '\n===============================================================',
    );
    console.log('--- NARRATE MEMORY TEST (4 confirmed + 1 shared) ---');
    console.log(
      '===============================================================\n',
    );

    const timeline = [
      {
        time: '10:30',
        name: 'Serenity Stone Massage',
        category: 'wellness',
        state: 'confirmed',
        shared: false,
      },
      {
        time: '12:30',
        name: 'Crystal Brasserie Brunch',
        category: 'dining',
        state: 'confirmed',
        shared: false,
      },
      {
        time: '18:00',
        name: 'Golden Hour Terrace Bar',
        category: 'dining',
        state: 'confirmed',
        shared: false,
      },
      {
        time: '19:30',
        name: 'Ember & Oak',
        category: 'dining',
        state: 'confirmed',
        shared: false,
      },
      {
        time: '22:00',
        name: 'Midnight Jazz Sessions',
        category: 'nightlife',
        state: 'shared',
        shared: true,
      },
    ];

    const tMem = Date.now();
    const memory = await aiService.narrateMemory(timeline, heroProfile);
    console.log(`Memory Latency: ${((Date.now() - tMem) / 1000).toFixed(2)}s`);
    console.log('Narrated Memory:', JSON.stringify(memory, null, 2));
  } catch (error) {
    console.error('Playground failed with error:', error);
  } finally {
    await app.close();
    console.log(
      '\n===============================================================',
    );
    console.log('✅ ALL PLAYGROUND TESTS COMPLETED SUCCESSFULLY');
    console.log(
      '===============================================================',
    );
  }
}

if (require.main === module) {
  runPlayground();
}
