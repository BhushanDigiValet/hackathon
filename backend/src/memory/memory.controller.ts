import { Controller, Get, Post, Req } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { guestId } from '../common/guest-id';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  async getMemory(@Req() req: any) {
    return this.memoryService.getMemory(guestId(req));
  }

  @Post()
  async createMemory(@Req() req: any) {
    return this.memoryService.narrate(guestId(req));
  }
}
