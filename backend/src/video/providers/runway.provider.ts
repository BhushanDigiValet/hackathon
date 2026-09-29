import { Logger } from '@nestjs/common';
import {
  IVideoProvider,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoJobStatus,
} from '../interfaces/video-generation.interface';

export class RunwayProvider implements IVideoProvider {
  public readonly name = 'runway';
  private readonly logger = new Logger(RunwayProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly requestTimeoutMs = 15000;

  constructor(apiKey: string, baseUrl = 'https://api.runwayml.com/v1') {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'RunwayProvider initialization failed: API key is required.',
      );
    }
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Submits a generation task to the Runway API (Gen-3 Alpha Turbo).
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
      taskType: 'gen3a_turbo',
      promptText: builtPrompt,
      duration: options?.duration && options.duration > 5 ? 10 : 5,
      ratio: this.mapRatio(options?.aspectRatio),
    };

    const response = await this.fetchWithTimeout(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Runway-Version': '2024-09-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await this.handleHttpError(response, 'Runway video creation failed');
    }

    const data = await response.json();
    const jobId = data.id;

    if (!jobId) {
      throw new Error('Runway API response missing task id');
    }

    const status = this.mapStatus(data.status);

    return {
      jobId,
      status,
      metadata: {
        createdAt: data.createdAt,
        taskType: data.taskType,
      },
    };
  }

  /**
   * Queries the status of an ongoing Runway task.
   */
  public async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/tasks/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-09-13',
        },
      },
    );

    if (!response.ok) {
      await this.handleHttpError(
        response,
        `Runway task check failed for jobId: ${jobId}`,
      );
    }

    const data = await response.json();
    const status = this.mapStatus(data.status);
    const nowIso = new Date().toISOString();

    const videoUrl =
      Array.isArray(data.output) && data.output.length > 0
        ? data.output[0]
        : undefined;

    return {
      jobId,
      status,
      prompt: data.promptText || '',
      provider: this.name,
      videoUrl,
      progress:
        typeof data.progress === 'number'
          ? Math.round(data.progress * 100)
          : undefined,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso,
      completedAt: status === 'completed' ? nowIso : undefined,
      error:
        data.failure ||
        data.failureCode ||
        (status === 'failed' ? 'Generation failed on Runway' : undefined),
      metadata: {
        taskType: data.taskType,
      },
    };
  }

  private mapRatio(ratio?: string): '16:9' | '9:16' {
    if (ratio?.trim() === '9:16') return '9:16';
    return '16:9';
  }

  private mapStatus(status?: string): VideoJobStatus {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'queued';
      case 'THROTTLED':
      case 'RUNNING':
        return 'processing';
      case 'SUCCEEDED':
        return 'completed';
      case 'FAILED':
      case 'CANCELLED':
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
          `Runway provider request timed out after ${this.requestTimeoutMs}ms`,
        );
      }
      throw new Error(`Network error contacting Runway API: ${err.message}`);
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
      errorDetail = errBody.error || errBody.message || JSON.stringify(errBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    if (response.status === 401 || response.status === 403) {
      this.logger.error(
        'Runway authentication failed. Check VIDEO_PROVIDER_API_KEY.',
      );
      throw new Error(
        `${prefix}: Invalid or unauthorized provider API credentials`,
      );
    }

    if (response.status === 429) {
      this.logger.warn('Runway rate limit exceeded.');
      throw new Error(
        `${prefix}: Provider rate limit reached. Please retry later.`,
      );
    }

    throw new Error(`${prefix}: HTTP ${response.status} - ${errorDetail}`);
  }
}
