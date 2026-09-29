import { Controller, Get, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { guestId } from '../common/guest-id';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async getEvents(@Req() req: any) {
    return this.eventsService.getEvents(guestId(req));
  }
}
