import { Controller, Get, Put, Body, Req } from '@nestjs/common';
import { ItineraryService } from './itinerary.service';
import { GuestItinerary } from '../entities';
import { guestId } from '../common/guest-id';

@Controller('itinerary')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Get()
  async getItinerary(@Req() req: any) {
    return this.itineraryService.getForGuest(guestId(req));
  }

  @Put()
  async upsertItinerary(
    @Req() req: any,
    @Body() body: Partial<GuestItinerary>,
  ) {
    return this.itineraryService.upsertForGuest(guestId(req), body);
  }
}
