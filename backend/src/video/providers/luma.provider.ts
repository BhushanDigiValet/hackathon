import { Logger } from '@nestjs/common';
import {
  IVideoProvider,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoJobStatus,
} from '../interfaces/video-generation.interface';

export class LumaProvider implements IVideoProvider {
  public readonly name = 'luma';
  private readonly logger = new Logger(LumaProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly requestTimeoutMs = 15000;

  constructor(
    apiKey: string,
    baseUrl = 'https://api.lumalabs.ai/dream-machine/v1',
  ) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'LumaProvider initialization failed: API key is required.',
      );
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Dispatches a generation request to the Luma Dream Machine API.
   */
  public async generateVideo(
    builtPrompt: string,
    options?: VideoGenerationOptions,
  ): Promise<{
    jobId: string;
    status: VideoJobStatus;
    metadata?: Record<string, any>;
  }> {
    const payload: Record<string, any> = {
      prompt: builtPrompt,
    };

    if (options?.aspectRatio) {
      payload.aspect_ratio = this.mapAspectRatio(options.aspectRatio);
    }

    if (options?.loop !== undefined) {
      payload.loop = options.loop;
    }

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/generations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      await this.handleHttpError(response, 'Luma video creation failed');
    }

    const data = await response.json();
    const jobId = data.id || data.generation_id;

    if (!jobId) {
      throw new Error('Luma API response missing generation identifier');
    }

    const status = this.mapStatus(data.state);

    return {
      jobId,
      status,
      metadata: {
        createdAt: data.created_at,
        model: data.model || 'dream-machine',
      },
    };
  }

  /**
   * Retrieves the current generation state from Luma API.
   */
  public async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/generations/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      await this.handleHttpError(
        response,
        `Luma status check failed for jobId: ${jobId}`,
      );
    }

    const data = await response.json();
    const status = this.mapStatus(data.state);
    const nowIso = new Date().toISOString();

    const result: VideoGenerationResult = {
      jobId,
      status,
      prompt: data.prompt || '',
      provider: this.name,
      videoUrl: data.assets?.video || undefined,
      thumbnailUrl: data.assets?.image || undefined,
      createdAt: data.created_at || nowIso,
      updatedAt: nowIso,
      completedAt: status === 'completed' ? nowIso : undefined,
      error:
        data.failure_reason ||
        (status === 'failed' ? 'Generation failed on provider' : undefined),
      metadata: {
        model: data.model,
      },
    };

    return result;
  }

  /**
   * Normalizes aspect ratios to Luma-supported values (16:9, 9:16, 1:1, 4:3, 3:4, 21:9, 9:21).
   */
  private mapAspectRatio(aspectRatio: string): string {
    const cleaned = aspectRatio.trim();
    const valid = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', '9:21'];
    return valid.includes(cleaned) ? cleaned : '16:9';
  }

  /**
   * Maps Luma internal states to unified VideoJobStatus.
   */
  private mapStatus(lumaState?: string): VideoJobStatus {
    switch (lumaState?.toLowerCase()) {
      case 'queued':
        return 'queued';
      case 'dreaming':
      case 'processing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'processing';
    }
  }

  /**
   * Helper that executes fetch with a hard timeout using AbortController.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs,
    );

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Luma provider request timed out after ${this.requestTimeoutMs}ms`,
        );
      }
      throw new Error(`Network error contacting Luma API: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Centralized HTTP error handler that avoids leaking secret keys.
   */
  private async handleHttpError(
    response: Response,
    prefix: string,
  ): Promise<never> {
    let errorDetail = '';
    try {
      const errBody = await response.json();
      errorDetail =
        errBody.message || errBody.detail || JSON.stringify(errBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    if (response.status === 401 || response.status === 403) {
      this.logger.error(
        'Luma provider authentication failed. Check VIDEO_PROVIDER_API_KEY.',
      );
      throw new Error(
        `${prefix}: Invalid or unauthorized provider API credentials`,
      );
    }

    if (response.status === 429) {
      this.logger.warn('Luma rate limit exceeded.');
      throw new Error(
        `${prefix}: Provider rate limit reached. Please retry later.`,
      );
    }

    throw new Error(`${prefix}: HTTP ${response.status} - ${errorDetail}`);
  }
}
