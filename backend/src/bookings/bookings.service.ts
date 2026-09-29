import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingRequest, StayPlanItem, CatalogueItem, StayProfile } from '../entities';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingRequest) private readonly bookingRepo: Repository<BookingRequest>,
    @InjectRepository(StayPlanItem) private readonly planRepo: Repository<StayPlanItem>,
    @InjectRepository(CatalogueItem) private readonly catalogueRepo: Repository<CatalogueItem>,
    @InjectRepository(StayProfile) private readonly profileRepo: Repository<StayProfile>,
  ) {}

  async createBooking(guestId: number, planItemId: number, withUpsell: boolean) {
    const planItem = await this.planRepo.findOne({ where: { id: planItemId, guestId } });
    if (!planItem) throw new Error('Plan item not found');

    const catItem = await this.catalogueRepo.findOne({ where: { id: planItem.catalogueItemId } });
    if (!catItem) throw new Error('Catalogue item not found');

    const profile = await this.profileRepo.findOne({ where: { guestId } });
    const partySize = profile?.preferences?.partySize || 1;
    let totalPrice = Number(catItem.price) || 0;

    if (withUpsell && planItem.details?.upsellItemId) {
      const upsellItem = await this.catalogueRepo.findOne({ where: { id: planItem.details.upsellItemId } });
      if (upsellItem) {
        totalPrice += Number(upsellItem.price) || 0;
      }
    }
    
    totalPrice *= partySize;

    const guestIntent = (profile?.preferences?.rawPrompt || '').substring(0, 160);

    const booking = this.bookingRepo.create({
      guestId,
      status: 'pending',
      requestDetails: {
        planItemId,
        partySize,
        totalPrice,
        guestIntent,
        withUpsell
      }
    });
    
    await this.bookingRepo.save(booking);

    planItem.details = {
      ...planItem.details,
      state: 'pending',
      bookingId: booking.id
    };
    await this.planRepo.save(planItem);

    return booking;
  }

  async getBookings(guestId: number) {
    return this.bookingRepo.find({ where: { guestId } });
  }
}
