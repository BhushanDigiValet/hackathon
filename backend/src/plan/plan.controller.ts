import { Controller, Post, Body, Req, Param, Delete } from '@nestjs/common';
import { PlanService } from './plan.service';
import { guestId } from '../common/guest-id';

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post('generate')
  async generatePlan(@Req() req: any) {
    return this.planService.generate(guestId(req));
  }

  @Post('createItenaryFromLlm')
  async createItineraryFromLlm(
    @Body()
    body: {
      guestId: number;
      defaultPrompt: string;
      travelCompanyId: number;
      atmosphereMoodIds: number[];
    },
  ) {
    return this.planService.createItineraryFromLlm(body.guestId, body);
  }

  @Post('reshape')
  async reshapePlan(@Req() req: any, @Body() body: { message: string }) {
    return this.planService.reshape(guestId(req), body.message);
  }

  @Post('reshape/:id/accept')
  async acceptReshape(@Req() req: any, @Param('id') id: string) {
    return this.planService.acceptReshape(guestId(req), id);
  }

  @Delete('items/:id')
  async deleteItem(@Req() req: any, @Param('id') id: string) {
    return this.planService.deleteItem(guestId(req), Number(id));
  }
}
