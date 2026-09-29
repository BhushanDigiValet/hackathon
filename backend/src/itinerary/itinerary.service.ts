import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuestItinerary } from '../entities';

@Injectable()
export class ItineraryService {
  constructor(
    @InjectRepository(GuestItinerary)
    private readonly itineraryRepo: Repository<GuestItinerary>,
  ) {}

  async getForGuest(guestId: number) {
    const itinerary = await this.itineraryRepo.findOne({ where: { guestId } });
    if (!itinerary) {
      throw new NotFoundException(`No itinerary found for guest ${guestId}`);
    }
    return itinerary;
  }

  /**
   * Creates the guest's itinerary, or updates it if one already exists.
   * A guest only ever has a single itinerary, keyed by guestId.
   */
  async upsertForGuest(guestId: number, data: Partial<GuestItinerary>) {
    // id/guestId/timestamps are server-controlled
    const {
      id: _id,
      guestId: _guestId,
      createdAt: _c,
      updatedAt: _u,
      ...fields
    } = data;

    const existing = await this.itineraryRepo.findOne({ where: { guestId } });
    const itinerary = existing
      ? this.itineraryRepo.merge(existing, fields)
      : this.itineraryRepo.create({
          title: 'Your Curated Journey',
          items: [],
          ...fields,
          guestId,
        });
    return this.itineraryRepo.save(itinerary);
  }
}
