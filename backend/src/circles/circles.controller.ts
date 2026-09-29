import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CirclesService, SwipeAction } from './circles.service';
import { guestId } from '../common/guest-id';

@Controller('circles')
export class CirclesController {
  constructor(private readonly circlesService: CirclesService) {}

  @Get('feed')
  async getFeed(@Req() req: any, @Query('limit') limit?: string) {
    return this.circlesService.getFeed(
      guestId(req),
      limit ? Number(limit) || 10 : 10,
    );
  }

  @Post('swipe')
  async swipe(
    @Req() req: any,
    @Body() body: { itineraryId: number; action: SwipeAction },
  ) {
    return this.circlesService.swipe(
      guestId(req),
      Number(body?.itineraryId),
      body?.action,
    );
  }

  @Get('joined')
  async getJoined(@Req() req: any) {
    return this.circlesService.getJoined(guestId(req));
  }

  @Delete('swipes')
  async resetSwipes(@Req() req: any) {
    return this.circlesService.resetSwipes(guestId(req));
  }
}
