import { Logger } from '@nestjs/common';
import {
  IVideoProvider,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoJobStatus,
} from '../interfaces/video-generation.interface';

export class PikaProvider implements IVideoProvider {
  public readonly name = 'pika';
  private readonly logger = new Logger(PikaProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly requestTimeoutMs = 15000;

  constructor(apiKey: string, baseUrl = 'https://api.pika.art/v1') {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'PikaProvider initialization failed: API key is required.',
      );
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Submits a generation request to the Pika API.
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
      promptText: builtPrompt,
      options: {
        aspectRatio: options?.aspectRatio || '16:9',
        frameRate: 24,
        camera: options?.cameraMovement ? { zoom: 'in' } : undefined,
      },
    };

    if (options?.negativePrompt) {
      payload.options.negativePrompt = options.negativePrompt;
    }

    const response = await this.fetchWithTimeout(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await this.handleHttpError(response, 'Pika video creation failed');
    }

    const data = await response.json();
    const jobId = data.job?.id || data.id;

    if (!jobId) {
      throw new Error('Pika API response missing job identifier');
    }

    return {
      jobId,
      status: this.mapStatus(data.job?.status || data.status),
      metadata: {
        createdAt: data.createdAt,
      },
    };
  }

  /**
   * Retrieves the current generation state from Pika API.
   */
  public async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/jobs/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      await this.handleHttpError(
        response,
        `Pika status check failed for jobId: ${jobId}`,
      );
    }

    const data = await response.json();
    const job = data.job || data;
    const status = this.mapStatus(job.status);
    const nowIso = new Date().toISOString();

    const videoUrl = job.videos?.[0]?.videoUrl || job.videoUrl || undefined;
    const thumbnailUrl =
      job.videos?.[0]?.posterUrl || job.thumbnailUrl || undefined;

    return {
      jobId,
      status,
      prompt: job.promptText || '',
      provider: this.name,
      videoUrl,
      thumbnailUrl,
      progress: typeof job.progress === 'number' ? job.progress : undefined,
      createdAt: job.createdAt || nowIso,
      updatedAt: nowIso,
      completedAt: status === 'completed' ? nowIso : undefined,
      error:
        job.error ||
        (status === 'failed' ? 'Generation failed on Pika' : undefined),
    };
  }

  private mapStatus(status?: string): VideoJobStatus {
    switch (status?.toLowerCase()) {
      case 'submitted':
      case 'queued':
        return 'queued';
      case 'processing':
      case 'in-progress':
        return 'processing';
      case 'finished':
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
      case 'rejected':
        return 'failed';
      default:
        return 'processing';
    }
  }

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
          `Pika provider request timed out after ${this.requestTimeoutMs}ms`,
        );
      }
      throw new Error(`Network error contacting Pika API: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleHttpError(
    response: Response,
    prefix: string,
  ): Promise<never> {
    let errorDetail = '';
    try {
      const errBody = await response.json();
      errorDetail = errBody.message || JSON.stringify(errBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    if (response.status === 401 || response.status === 403) {
      this.logger.error(
        'Pika authentication failed. Check VIDEO_PROVIDER_API_KEY.',
      );
      throw new Error(
        `${prefix}: Invalid or unauthorized provider API credentials`,
      );
    }

    if (response.status === 429) {
      this.logger.warn('Pika rate limit exceeded.');
      throw new Error(
        `${prefix}: Provider rate limit reached. Please retry later.`,
      );
    }

    throw new Error(`${prefix}: HTTP ${response.status} - ${errorDetail}`);
  }
}
