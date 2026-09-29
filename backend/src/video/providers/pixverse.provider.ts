import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  IVideoProvider,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoJobStatus,
  GenerateVideoRequest,
} from '../interfaces/video-generation.interface';

export class PixVerseProvider implements IVideoProvider {
  public readonly name = 'pixverse';
  private readonly logger = new Logger(PixVerseProvider.name);
  private readonly baseUrl = 'https://app-api.pixverse.ai/openapi/v2/video';
  private readonly apiKey: string;
  private readonly requestTimeoutMs = 15000;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'PixVerseProvider initialization failed: API key is required.',
      );
    }
    this.apiKey = apiKey.trim();
    this.logger.debug(
      `PixVerse API key loaded: ${this.apiKey.substring(0, 8)}...`,
    );
  }

  public async generateVideo(
    builtPrompt: string,
    options?: VideoGenerationOptions,
    request?: GenerateVideoRequest,
  ): Promise<{
    jobId: string;
    status: VideoJobStatus;
    metadata?: Record<string, any>;
  }> {
    const payload: Record<string, any> = {
      prompt: builtPrompt,
      aspect_ratio: options?.aspectRatio ?? '16:9',
      duration: options?.duration ?? 5,
      model: (options as any)?.model ?? 'v6',
      quality: options?.resolution ?? (options as any)?.quality ?? '720p',
    };

    const traceId = randomUUID();
    
    this.logger.log(`[PixVerse] generateVideo: POST ${this.baseUrl}/text/generate`);

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/text/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-KEY': this.apiKey,
          'Ai-trace-id': traceId,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      await this.handleHttpError(response, 'PixVerse video creation failed');
    }

    const data = await response.json();

    if (data?.ErrCode === 10005) {
      this.logger.error(`PixVerse authentication failed: ${data.ErrMsg}`);
      throw new Error('Invalid or unauthorized provider API credentials');
    }

    if (data?.ErrCode && data.ErrCode !== 0) {
      this.logger.error(`PixVerse API returned error code ${data.ErrCode}: ${data.ErrMsg}`);
      throw new Error(`PixVerse video creation failed: ${data.ErrMsg}`);
    }

    const jobId = data?.Resp?.video_id || data?.video_id;

    if (!jobId) {
      this.logger.error(
        `PixVerse API response missing video_id: ${JSON.stringify(data)}`,
      );
      throw new Error('PixVerse API response missing generation identifier');
    }

    return {
      jobId: String(jobId),
      status: 'processing',
      metadata: {
        model: payload.model,
        traceId,
      },
    };
  }

  public async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    const traceId = randomUUID();
    
    this.logger.log(`[PixVerse] checkStatus: GET ${this.baseUrl}/result/${jobId}`);

    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/result/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: {
          'API-KEY': this.apiKey,
          'Ai-trace-id': traceId,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      await this.handleHttpError(
        response,
        `PixVerse status check failed for jobId: ${jobId}`,
      );
    }

    const data = await response.json();
    
    if (data?.ErrCode === 10005) {
      this.logger.error(`PixVerse authentication failed: ${data.ErrMsg}`);
      throw new Error('Invalid or unauthorized provider API credentials');
    }
    
    const resp = data?.Resp || data || {};

    const rawStatus = String(resp.status || '').toLowerCase();
    let status: VideoJobStatus = 'processing';
    if (
      rawStatus === 'completed' ||
      rawStatus === 'success' ||
      rawStatus === '4' || 
      rawStatus === 'true'
    ) {
      status = 'completed';
    } else if (
      rawStatus === 'failed' ||
      rawStatus === 'error' ||
      rawStatus === '5'
    ) {
      status = 'failed';
    } else {
      status = 'processing';
    }

    const nowIso = new Date().toISOString();

    const result: VideoGenerationResult = {
      jobId,
      status,
      prompt: resp.prompt || '',
      provider: this.name,
      videoUrl: resp.url || resp.video_url || undefined,
      thumbnailUrl: resp.cover_url || undefined,
      createdAt: resp.created_at || nowIso,
      updatedAt: nowIso,
      completedAt: status === 'completed' ? nowIso : undefined,
      error:
        status === 'failed'
          ? resp.error_msg || 'Generation failed on provider'
          : undefined,
    };

    return result;
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
          `PixVerse provider request timed out after ${this.requestTimeoutMs}ms`,
        );
      }
      throw new Error(`Network error contacting PixVerse API: ${err.message}`);
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
      errorDetail =
        errBody.message || errBody.ErrMsg || JSON.stringify(errBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    this.logger.error(
      `PixVerse API error: status=${response.status}, body=${errorDetail}`,
    );

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Invalid or unauthorized provider API credentials`,
      );
    }
    if (response.status === 400) {
      throw new Error(`${prefix}: Invalid request or payload format.`);
    }
    if (response.status === 429) {
      throw new Error(`${prefix}: Rate limit exceeded.`);
    }
    if (response.status >= 500) {
      throw new Error(`${prefix}: PixVerse server error.`);
    }

    throw new Error(`${prefix}: HTTP ${response.status} - ${errorDetail}`);
  }
}
