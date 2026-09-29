import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  GenerateVideoRequest,
  VideoGenerationResult,
} from './interfaces/video-generation.interface';
import { PromptBuilderService } from './prompt-builder/prompt-builder.service';
import { VideoRequestValidator } from './validation/video-request.validator';
import { VideoProviderFactory } from './providers/provider.factory';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);

  /**
   * Internal job storage to track generation requests and statuses across the application.
   */
  private readonly jobs = new Map<string, VideoGenerationResult>();

  constructor(
    private readonly promptBuilder: PromptBuilderService,
    private readonly providerFactory: VideoProviderFactory,
  ) {}

  /**
   * Validates and submits a video-generation request to the configured AI video provider.
   *
   * @param rawRequest User input describing the video, subject, scene, and options.
   * @returns Initial generation status and tracking job ID.
   */
  public async generateVideo(
    rawRequest: GenerateVideoRequest,
  ): Promise<VideoGenerationResult> {
    // 1. Validate request
    const validatedRequest = VideoRequestValidator.validate(rawRequest);

    // 2. Build the final structured prompt
    const builtPrompt = this.promptBuilder.buildPrompt(validatedRequest);
    this.logger.debug(`Compiled generation prompt:\n${builtPrompt}`);

    // 3. Resolve active provider
    const provider = this.providerFactory.getProvider();
    this.logger.log(
      `Dispatching video generation request to provider '${provider.name}'...`,
    );

    const nowIso = new Date().toISOString();

    try {
      // 4. Send request to external provider with retry for transient network issues
      const providerResponse = await this.executeWithRetry(() =>
        provider.generateVideo(
          builtPrompt,
          validatedRequest.options,
          validatedRequest,
        ),
      );

      const jobRecord: VideoGenerationResult = {
        jobId: providerResponse.jobId,
        status: providerResponse.status || 'queued',
        prompt: builtPrompt,
        provider: provider.name,
        progress: providerResponse.status === 'queued' ? 0 : 10,
        createdAt: nowIso,
        updatedAt: nowIso,
        options: validatedRequest.options,
        metadata: providerResponse.metadata,
      };

      // 5. Store for status tracking
      this.jobs.set(jobRecord.jobId, jobRecord);

      return jobRecord;
    } catch (error: any) {
      this.logger.error(
        `Failed to initiate video generation with provider '${provider.name}': ${error.message}`,
      );
      this.handleServiceError(error);
    }
  }

  /**
   * Checks and updates the progress or outcome of a video-generation job.
   *
   * @param jobId The unique ID of the generation task.
   * @returns Current status, progress, and video URL when ready.
   */
  public async getVideoStatus(jobId: string): Promise<VideoGenerationResult> {
    if (!jobId || typeof jobId !== 'string') {
      throw new NotFoundException('A valid jobId must be provided');
    }

    const cached = this.jobs.get(jobId);

    // If job is already in terminal state ('completed' or 'failed'), return stored result
    if (
      cached &&
      (cached.status === 'completed' || cached.status === 'failed')
    ) {
      return cached;
    }

    const provider = this.providerFactory.getProvider();

    try {
      const current = await this.executeWithRetry(() =>
        provider.checkStatus(jobId),
      );

      const updatedRecord: VideoGenerationResult = {
        ...(cached || {}),
        ...current,
        jobId,
        provider: provider.name,
        prompt: cached?.prompt || current.prompt,
        options: cached?.options || current.options,
        updatedAt: new Date().toISOString(),
      };

      if (current.status === 'completed' && !updatedRecord.completedAt) {
        updatedRecord.completedAt = new Date().toISOString();
      }

      this.jobs.set(jobId, updatedRecord);
      return updatedRecord;
    } catch (error: any) {
      this.logger.warn(
        `Error checking status for job '${jobId}': ${error.message}`,
      );

      // If we have a cached record, return it with a warning rather than failing completely
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            lastStatusCheckWarning: error.message,
          },
        };
      }

      this.handleServiceError(error);
    }
  }

  /**
   * Polls the video generation job asynchronously until completion or timeout.
   * Useful for synchronous-like workflows or batch jobs.
   *
   * @param request The video generation request.
   * @param maxWaitMs Maximum time to wait before timing out (default 180s).
   * @param pollIntervalMs Interval between status checks (default 3s).
   */
  public async generateAndWait(
    request: GenerateVideoRequest,
    maxWaitMs = 180000,
    pollIntervalMs = 3000,
  ): Promise<VideoGenerationResult> {
    const initial = await this.generateVideo(request);
    let current = initial;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      if (current.status === 'completed' || current.status === 'failed') {
        return current;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      current = await this.getVideoStatus(initial.jobId);
    }

    // Timeout exceeded
    throw new HttpException(
      {
        message: `Video generation timed out after ${maxWaitMs / 1000} seconds`,
        jobId: initial.jobId,
        status: current.status,
      },
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }

  /**
   * Preview the generated prompt without sending a request to the external AI provider.
   */
  public previewPrompt(rawRequest: GenerateVideoRequest): {
    prompt: string;
    validatedRequest: GenerateVideoRequest;
  } {
    const validatedRequest = VideoRequestValidator.validate(rawRequest);
    const prompt = this.promptBuilder.buildPrompt(validatedRequest);
    return { prompt, validatedRequest };
  }

  /**
   * Returns recent video generation jobs.
   */
  public getJobHistory(limit = 20): VideoGenerationResult[] {
    const all = Array.from(this.jobs.values());
    all.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return all.slice(0, limit);
  }

  /**
   * Executes an asynchronous action with automatic retry and exponential backoff.
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 2,
    baseDelayMs = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;

        // Do not retry client/validation errors, authentication errors, or rate limits
        if (
          err.message?.includes('Invalid or unauthorized') ||
          err.message?.includes('validation') ||
          err.message?.includes('rate limit') ||
          err.status === 400 ||
          err.status === 401 ||
          err.status === 403 ||
          err.status === 429
        ) {
          throw err;
        }

        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          this.logger.warn(
            `Operation failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Translates internal provider errors into appropriate NestJS HTTP exceptions
   * ensuring no secret keys or internal credentials leak out.
   */
  private handleServiceError(error: any): never {
    if (error instanceof HttpException) {
      throw error;
    }

    const message =
      error?.message || 'External video generation provider error';

    if (message.includes('rate limit')) {
      throw new HttpException(
        {
          message:
            'AI video generation provider rate limit reached. Please retry shortly.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (message.includes('Invalid or unauthorized')) {
      throw new HttpException(
        {
          message:
            'Authentication error communicating with AI video generation provider.',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (message.includes('timed out')) {
      throw new HttpException(
        { message: 'AI video generation provider request timed out.' },
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    throw new InternalServerErrorException(message);
  }
}
