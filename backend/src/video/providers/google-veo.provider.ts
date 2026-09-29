import { Logger } from '@nestjs/common';
import {
  IVideoProvider,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoJobStatus,
} from '../interfaces/video-generation.interface';

export class GoogleVeoProvider implements IVideoProvider {
  public readonly name = 'gemini';
  private readonly logger = new Logger(GoogleVeoProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly requestTimeoutMs = 15000;

  constructor(apiKey: string, model = 'veo-3.1-generate-preview') {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('GoogleVeoProvider initialization failed: API key is required.');
    }
    this.apiKey = apiKey.trim();
    this.model = model;
  }

  /**
   * Dispatches a video generation task to Google Generative Language API (Veo).
   */
  public async generateVideo(
    builtPrompt: string,
    options?: VideoGenerationOptions,
  ): Promise<{ jobId: string; status: VideoJobStatus; metadata?: Record<string, any> }> {
    const url = `${this.baseUrl}/models/${this.model}:predictLongRunning?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      instances: [
        {
          prompt: builtPrompt,
        },
      ],
      parameters: {
        aspectRatio: this.mapAspectRatio(options?.aspectRatio),
        sampleCount: 1,
      },
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await this.handleHttpError(response, 'Google Veo video creation failed');
    }

    const data = await response.json();
    const operationName = data.name;

    if (!operationName) {
      throw new Error('Google Veo API response missing operation name');
    }

    return {
      jobId: operationName,
      status: 'queued',
      metadata: {
        model: this.model,
        operation: operationName,
      },
    };
  }

  /**
   * Polls the long-running operation status from Google Generative Language API.
   */
  public async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    const operationPath = jobId.startsWith('operations/') ? jobId : `operations/${jobId}`;
    const url = `${this.baseUrl}/${operationPath}?key=${encodeURIComponent(this.apiKey)}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
    });

    if (!response.ok) {
      await this.handleHttpError(response, `Google Veo status check failed for: ${jobId}`);
    }

    const data = await response.json();
    const nowIso = new Date().toISOString();

    if (data.error) {
      return {
        jobId,
        status: 'failed',
        prompt: '',
        provider: this.name,
        error: data.error.message || 'Google Veo video generation failed',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }

    if (!data.done) {
      return {
        jobId,
        status: 'processing',
        prompt: '',
        provider: this.name,
        progress: 40,
        createdAt: nowIso,
        updatedAt: nowIso,
        metadata: { done: false },
      };
    }

    // Done: Extract video URI
    const generatedVideos =
      data.response?.generatedVideos ||
      data.response?.videos ||
      [];
    const videoUri = generatedVideos[0]?.video?.uri || generatedVideos[0]?.uri || undefined;

    return {
      jobId,
      status: 'completed',
      prompt: '',
      provider: this.name,
      videoUrl: videoUri,
      progress: 100,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: nowIso,
      metadata: {
        model: this.model,
      },
    };
  }

  private mapAspectRatio(aspectRatio?: string): '16:9' | '9:16' | '1:1' {
    if (aspectRatio?.trim() === '9:16') return '9:16';
    if (aspectRatio?.trim() === '1:1') return '1:1';
    return '16:9';
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Google Veo provider request timed out after ${this.requestTimeoutMs}ms`);
      }
      throw new Error(`Network error contacting Google API: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleHttpError(response: Response, prefix: string): Promise<never> {
    let errorDetail = '';
    try {
      const errBody = await response.json();
      errorDetail = errBody.error?.message || errBody.message || JSON.stringify(errBody);
    } catch {
      errorDetail = await response.text().catch(() => '');
    }

    if (response.status === 400 || response.status === 403) {
      this.logger.error(`Google API authorization error (${response.status}): ${errorDetail}`);
      throw new Error(`${prefix}: ${errorDetail}`);
    }

    if (response.status === 429) {
      this.logger.warn('Google API rate limit exceeded.');
      throw new Error(`${prefix}: Provider rate limit reached. Please retry later.`);
    }

    throw new Error(`${prefix}: HTTP ${response.status} - ${errorDetail}`);
  }
}
