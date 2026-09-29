import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { guestId } from '../common/guest-id';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  async getBookings(@Req() req: any) {
    return this.bookingsService.getBookings(guestId(req));
  }

  @Post()
  async createBooking(@Req() req: any, @Body() body: { planItemId: number; withUpsell: boolean }) {
    return this.bookingsService.createBooking(guestId(req), body.planItemId, body.withUpsell);
  }
}
