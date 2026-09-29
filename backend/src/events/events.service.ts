import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuestEvent } from '../entities';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(GuestEvent)
    private readonly eventsRepo: Repository<GuestEvent>,
  ) {}

  async emit(
    guestId: number,
    type: string,
    title: string,
    body?: string,
    link?: string,
  ) {
    const event = this.eventsRepo.create({ guestId, type, title, body, link });
    return this.eventsRepo.save(event);
  }
}
