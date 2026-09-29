import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GuestService } from './guest.service';
import { Guest } from '../entities';

@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get()
  async findAll() {
    return this.guestService.findAll();
  }

  /**
   * Hackathon login: resolves a guest by email. The frontend stores the
   * returned guestId and sends it as `x-guest-id` on later requests.
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email?: string }) {
    const email = body?.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('email is required');
    }
    const guest = await this.guestService.findByEmail(email);
    if (!guest) {
      throw new NotFoundException('No guest found for this email');
    }
    return { guestId: guest.id, name: guest.name, email: guest.email };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.guestService.findOne(Number(id));
  }

  @Post()
  async create(@Body() body: Partial<Guest>) {
    return this.guestService.create(body);
  }
}
