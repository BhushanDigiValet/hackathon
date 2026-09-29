import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { VideoGenerationService } from './video-generation.service';
import { VideoProviderFactory } from './providers/provider.factory';
import {
  GenerateVideoRequest,
  VideoGenerationResult,
} from './interfaces/video-generation.interface';

@Controller('video')
export class VideoGenerationController {
  constructor(
    private readonly videoService: VideoGenerationService,
    private readonly providerFactory: VideoProviderFactory,
  ) {}

  /**
   * Accepts a video generation request and kicks off asynchronous video generation.
   *
   * POST /api/video/generate
   */
  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateVideo(
    @Body() request: GenerateVideoRequest,
  ): Promise<VideoGenerationResult> {
    return this.videoService.generateVideo(request);
  }

  /**
   * Checks the status and retrieves the generated video for a given job.
   *
   * GET /api/video/status/:jobId
   */
  @Get('status/:jobId')
  async getStatus(
    @Param('jobId') jobId: string,
  ): Promise<VideoGenerationResult> {
    return this.videoService.getVideoStatus(jobId);
  }

  /**
   * Generates a video and polls synchronously until completion or timeout.
   * Useful for webhooks, background tasks, or tests.
   *
   * POST /api/video/generate-sync
   */
  @Post('generate-sync')
  @HttpCode(HttpStatus.OK)
  async generateSync(
    @Body() request: GenerateVideoRequest,
    @Query('timeoutMs') timeoutMs?: string,
  ): Promise<VideoGenerationResult> {
    const timeout = timeoutMs ? parseInt(timeoutMs, 10) : 120000;
    return this.videoService.generateAndWait(request, timeout);
  }

  /**
   * Previews the structured video generation prompt without sending it to an AI provider.
   *
   * POST /api/video/preview-prompt
   */
  @Post('preview-prompt')
  @HttpCode(HttpStatus.OK)
  previewPrompt(@Body() request: GenerateVideoRequest) {
    return this.videoService.previewPrompt(request);
  }

  /**
   * Returns metadata about available and active AI video providers.
   * Safe for frontend consumption: Never leaks API keys or secrets.
   *
   * GET /api/video/providers
   */
  @Get('providers')
  getProviders() {
    const active = this.providerFactory.getProvider();
    return {
      activeProvider: active.name,
      availableProviders: this.providerFactory.getAvailableProviders(),
    };
  }

  /**
   * Returns recent video generation jobs.
   *
   * GET /api/video/history
   */
  @Get('history')
  getHistory(@Query('limit') limit?: string): VideoGenerationResult[] {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.videoService.getJobHistory(parsedLimit);
  }
}
