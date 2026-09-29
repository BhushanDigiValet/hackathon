import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
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
} from './entities';
import { seedAll } from './seed/all';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();

  // Seed all tables
  const guestRepo = app.get(getRepositoryToken(Guest));
  const profileRepo = app.get(getRepositoryToken(StayProfile));
  const catalogueRepo = app.get(getRepositoryToken(CatalogueItem));
  const planItemRepo = app.get(getRepositoryToken(StayPlanItem));
  const bookingRepo = app.get(getRepositoryToken(BookingRequest));
  const sharedPlanRepo = app.get(getRepositoryToken(SharedPlan));
  const planDeliveryRepo = app.get(getRepositoryToken(PlanDelivery));
  const groupMemberRepo = app.get(getRepositoryToken(GroupMember));
  const eventRepo = app.get(getRepositoryToken(GuestEvent));
  const memoryReelRepo = app.get(getRepositoryToken(MemoryReel));
  const atmosphereRepo = app.get(getRepositoryToken(MasterAtmosphere));
  const cadenceRepo = app.get(getRepositoryToken(MasterCadence));
  const travelCompanyRepo = app.get(getRepositoryToken(MasterTravelCompany));
  const itineraryRepo = app.get(getRepositoryToken(GuestItinerary));

  await seedAll(
    guestRepo,
    profileRepo,
    catalogueRepo,
    planItemRepo,
    bookingRepo,
    sharedPlanRepo,
    planDeliveryRepo,
    groupMemberRepo,
    eventRepo,
    memoryReelRepo,
    atmosphereRepo,
    cadenceRepo,
    travelCompanyRepo,
    itineraryRepo,
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on http://0.0.0.0:${port}/api`);
}
bootstrap();
