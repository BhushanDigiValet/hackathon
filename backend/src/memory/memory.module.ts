import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { VideoModule } from '../video/video.module';

@Module({
  imports: [VideoModule],
  controllers: [MemoryController],
  providers: [MemoryService],
})
export class MemoryModule {}
