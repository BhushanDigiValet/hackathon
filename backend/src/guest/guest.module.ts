import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from '../entities';
import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest])],
  controllers: [GuestController],
  providers: [GuestService],
  exports: [GuestService],
})
export class GuestModule {}
