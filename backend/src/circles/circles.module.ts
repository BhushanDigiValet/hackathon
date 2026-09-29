import { Module } from '@nestjs/common';
import { CirclesController } from './circles.controller';
import { CirclesService } from './circles.service';

// Repositories come from the global DatabaseModule; ProfileService and
// EventsService from their global modules.
@Module({
  controllers: [CirclesController],
  providers: [CirclesService],
})
export class CirclesModule {}
