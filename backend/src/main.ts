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
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}
bootstrap();
