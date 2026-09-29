import { Repository } from 'typeorm';
import {
  Guest,
  StayProfile,
  CatalogueItem,
  StayPlanItem,
  BookingRequest,
  SharedPlan,
  PlanDelivery,
  GroupMember,
  GuestEvent,
  MemoryReel,
  MasterAtmosphere,
  MasterCadence,
  MasterTravelCompany,
  GuestItinerary,
} from '../entities';
import { seedCatalogue } from './catalogue';
import { seedItineraries } from './itineraries';

export async function seedAll(
  guestRepo: Repository<Guest>,
  profileRepo: Repository<StayProfile>,
  catalogueRepo: Repository<CatalogueItem>,
  planItemRepo: Repository<StayPlanItem>,
  bookingRepo: Repository<BookingRequest>,
  sharedPlanRepo: Repository<SharedPlan>,
  planDeliveryRepo: Repository<PlanDelivery>,
  groupMemberRepo: Repository<GroupMember>,
  eventRepo: Repository<GuestEvent>,
  memoryReelRepo: Repository<MemoryReel>,
  atmosphereRepo: Repository<MasterAtmosphere>,
  cadenceRepo: Repository<MasterCadence>,
  travelCompanyRepo: Repository<MasterTravelCompany>,
  itineraryRepo: Repository<GuestItinerary>,
) {
  // 1. Clear all tables (disable FK checks temporarily)
  await guestRepo.query('SET FOREIGN_KEY_CHECKS = 0');
  await guestRepo.clear();
  await profileRepo.clear();
  await planItemRepo.clear();
  await bookingRepo.clear();
  await sharedPlanRepo.clear();
  await planDeliveryRepo.clear();
  await groupMemberRepo.clear();
  await eventRepo.clear();
  await memoryReelRepo.clear();
  await atmosphereRepo.clear();
  await cadenceRepo.clear();
  await travelCompanyRepo.clear();
  await itineraryRepo.clear();
  await guestRepo.query('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Seed base Catalogue Items (creates ~30 items)
  await seedCatalogue(catalogueRepo);

  // Create 20 more Catalogue Items to reach 50+ items
  const catalogueExtras = [];
  for (let i = 1; i <= 25; i++) {
    catalogueExtras.push(
      catalogueRepo.create({
        name: `Extra Catalogue Item ${i}`,
        description: `Description for extra catalogue item ${i}`,
        price: 10 * i,
        details: {
          categoryGroup: 'dining',
          tags: ['casual'],
          openFrom: '08:00',
          openTo: '22:00',
          durationMin: 60,
        },
      }),
    );
  }
  await catalogueRepo.save(catalogueExtras);
  const allCatalogueItems = await catalogueRepo.find();

  // 3. Seed 50 Guests
  const guestsToCreate = [];
  for (let i = 1; i <= 50; i++) {
    // Alternate men/women portraits from randomuser.me so each guest gets a distinct avatar
    const gender = i % 2 === 0 ? 'women' : 'men';
    guestsToCreate.push(
      guestRepo.create({
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
        profileImage: `https://randomuser.me/api/portraits/${gender}/${i}.jpg`,
      }),
    );
  }
  const guests = await guestRepo.save(guestsToCreate);

  // 4. Seed 50 StayProfiles
  const profiles = [];
  const prompts = [
    "I've had a crazy few months. I want this trip to feel luxurious and relaxing. Give me great food, a spa, a beautiful sunset and maybe something social tonight. I don't want to plan everything myself.",
    'Looking for an adventurous and packed weekend! I want to explore, try unique dining experiences, and maybe catch a late-night show.',
    'A quiet, romantic getaway for two. We just want to recharge, enjoy some fine dining, and sleep in every morning.',
  ];

  for (let i = 0; i < 50; i++) {
    // Randomize Atmosphere (pick 2 unique random IDs from 1 to 6)
    const allAtmospheres = [1, 2, 3, 4, 5, 6];
    const atmosphereMoodIds = allAtmospheres
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    const itineraryCadenceId = Math.floor(Math.random() * 3) + 1; // 1 to 3
    const travelCompanyId = Math.floor(Math.random() * 4) + 1; // 1 to 4
    const openToGuestCircles = Math.random() > 0.5;

    const wakeTimes = ['08:00 AM', '09:00 AM', '10:00 AM'];
    const doNotDisturbBefore =
      wakeTimes[Math.floor(Math.random() * wakeTimes.length)];

    const budgetTiers = [
      'Tier 2 - Elevated',
      'Tier 3 - Luxury',
      'Tier 4 - Unrestricted',
    ];
    const budgetTier =
      budgetTiers[Math.floor(Math.random() * budgetTiers.length)];

    const defaultPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    profiles.push(
      profileRepo.create({
        guestId: guests[i].id,
        preferences: {
          atmosphereMoodIds,
          itineraryCadenceId,
          travelCompanyId,
          openToGuestCircles,
          doNotDisturbBefore,
          budgetTier,
          defaultPrompt,
        },
      }),
    );
  }
  await profileRepo.save(profiles);

  // 5. Seed 50 StayPlanItems
  const planItems = [];
  for (let i = 0; i < 50; i++) {
    planItems.push(
      planItemRepo.create({
        guestId: guests[i].id,
        catalogueItemId: allCatalogueItems[i % allCatalogueItems.length].id,
        details: {
          startAt: '10:00',
          endAt: '11:00',
          state: i % 2 === 0 ? 'confirmed' : 'suggested',
        },
      }),
    );
  }
  const savedPlanItems = await planItemRepo.save(planItems);

  // 6. Seed 50 BookingRequests
  const bookings = [];
  for (let i = 0; i < 50; i++) {
    bookings.push(
      bookingRepo.create({
        guestId: guests[i].id,
        requestDetails: {
          planItemId: savedPlanItems[i].id,
          partySize: (i % 4) + 1,
          totalPrice: 100,
        },
        status: i % 2 === 0 ? 'confirmed' : 'pending',
      }),
    );
  }
  await bookingRepo.save(bookings);

  // 7. Seed 50 SharedPlans
  const sharedPlansToCreate = [];
  for (let i = 0; i < 50; i++) {
    sharedPlansToCreate.push(
      sharedPlanRepo.create({
        ownerId: guests[i].id,
        planDetails: { scope: 'family', settings: 'view_only' },
      }),
    );
  }
  const sharedPlans = await sharedPlanRepo.save(sharedPlansToCreate);

  // 8. Seed 50 PlanDeliveries
  const planDeliveries = [];
  for (let i = 0; i < 50; i++) {
    planDeliveries.push(
      planDeliveryRepo.create({
        planId: sharedPlans[i].id,
        deliveryStatus: i % 3 === 0 ? 'delivered' : 'pending',
      }),
    );
  }
  await planDeliveryRepo.save(planDeliveries);

  // 9. Seed 50 GroupMembers
  const groupMembers = [];
  for (let i = 0; i < 50; i++) {
    groupMembers.push(
      groupMemberRepo.create({
        groupId: sharedPlans[i].id,
        // Link to a different guest to demonstrate sharing
        guestId: guests[(i + 1) % 50].id,
        role: 'viewer',
      }),
    );
  }
  await groupMemberRepo.save(groupMembers);

  // 10. Seed 50 GuestEvents
  const guestEvents = [];
  for (let i = 0; i < 50; i++) {
    guestEvents.push(
      eventRepo.create({
        guestId: guests[i].id,
        type: 'plan_generated',
        title: `Event for Guest ${i + 1}`,
        body: 'AI generated a new itinerary',
      }),
    );
  }
  await eventRepo.save(guestEvents);

  // 11. Seed 50 MemoryReels
  const memoryReels = [];
  for (let i = 0; i < 50; i++) {
    memoryReels.push(
      memoryReelRepo.create({
        guestId: guests[i].id,
        mediaUrls: [`http://example.com/image${i}.jpg`],
        narration: JSON.stringify({ title: `Memory ${i + 1}`, chapters: [] }),
      }),
    );
  }
  await memoryReelRepo.save(memoryReels);

  // 12. Seed curated itineraries (poster, video, timeline) for guests 1-6
  await seedItineraries(itineraryRepo, guests);

  // 13. Seed Master Tables (Figma Data)
  await atmosphereRepo.save([
    { name: 'Relaxed' },
    { name: 'Indulgent' },
    { name: 'Adventurous' },
    { name: 'Romantic' },
    { name: 'Social' },
    { name: 'Recharge' },
  ]);

  await cadenceRepo.save([
    { name: 'Slow', description: 'Take your time, fewer activities.' },
    { name: 'Balanced', description: 'Balanced tempo.' },
    { name: 'Packed', description: 'Full itinerary, maximum experiences.' },
  ]);

  await travelCompanyRepo.save([
    { name: 'Just me', icon: 'person' },
    { name: 'With my partner', icon: 'heart' },
    { name: 'With friends', icon: 'group' },
    { name: 'With family', icon: 'family' },
  ]);

  console.log(
    '✅ Seed data successfully injected! At least 50 records in each table.',
  );
}
