import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoGenerationService } from './video-generation.service';
import { VideoGenerationController } from './video-generation.controller';
import { PromptBuilderService } from './prompt-builder/prompt-builder.service';
import { VideoProviderFactory } from './providers/provider.factory';

@Module({
  imports: [ConfigModule],
  controllers: [VideoGenerationController],
  providers: [
    PromptBuilderService,
    VideoProviderFactory,
    VideoGenerationService,
  ],
  exports: [VideoGenerationService, PromptBuilderService, VideoProviderFactory],
})
export class VideoModule {}
