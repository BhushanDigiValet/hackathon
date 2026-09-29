import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { GuestService } from './guest.service';
import { Guest } from '../entities';

@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get()
  async findAll() {
    return this.guestService.findAll();
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
