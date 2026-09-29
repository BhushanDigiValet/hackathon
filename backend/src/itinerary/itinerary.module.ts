import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestItinerary } from '../entities';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([GuestItinerary])],
  controllers: [ItineraryController],
  providers: [ItineraryService],
  exports: [ItineraryService],
})
export class ItineraryModule {}
