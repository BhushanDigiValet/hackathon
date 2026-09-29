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
} from '../entities';
import { seedCatalogue } from './catalogue';

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
    guestsToCreate.push(
      guestRepo.create({
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
      }),
    );
  }
  const guests = await guestRepo.save(guestsToCreate);

  // 4. Seed 50 StayProfiles
  const profiles = [];
  for (let i = 0; i < 50; i++) {
    profiles.push(
      profileRepo.create({
        guestId: guests[i].id,
        preferences: {
          budgetTier: i % 2 === 0 ? 'luxury' : 'standard',
          pace: i % 3 === 0 ? 'relaxed' : 'active',
          tags: ['spa', 'dining'],
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

  console.log(
    '✅ Seed data successfully injected! At least 50 records in each table.',
  );
}
