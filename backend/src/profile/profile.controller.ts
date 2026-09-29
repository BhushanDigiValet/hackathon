import { Controller, Get, Put, Post, Body, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { guestId } from '../common/guest-id';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('options')
  async getOptions() {
    return this.profileService.getOptions();
  }

  @Get()
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(guestId(req));
  }

  @Put()
  async updateProfile(@Req() req: any, @Body() body: any) {
    return this.profileService.updateProfile(guestId(req), body);
  }

  @Post('extract')
  async extractProfile(
    @Req() req: any,
    @Body() body: { prompt: string; selections: any },
  ) {
    return this.profileService.extract(
      guestId(req),
      body.prompt,
      body.selections,
    );
  }
}
