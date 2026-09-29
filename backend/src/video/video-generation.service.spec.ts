import { HttpException, HttpStatus } from '@nestjs/common';
import { VideoGenerationService } from './video-generation.service';
import { PromptBuilderService } from './prompt-builder/prompt-builder.service';
import { VideoProviderFactory } from './providers/provider.factory';
import { MockVideoProvider } from './providers/mock.provider';
import { GenerateVideoRequest } from './interfaces/video-generation.interface';

describe('VideoGenerationService', () => {
  let service: VideoGenerationService;
  let promptBuilder: PromptBuilderService;
  let providerFactory: VideoProviderFactory;
  let mockProvider: MockVideoProvider;

  beforeEach(() => {
    promptBuilder = new PromptBuilderService();
    mockProvider = new MockVideoProvider();

    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
      getAvailableProviders: jest
        .fn()
        .mockReturnValue(['mock', 'luma', 'runway', 'pika']),
      registerProvider: jest.fn(),
    } as unknown as VideoProviderFactory;

    service = new VideoGenerationService(promptBuilder, providerFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate, build prompt, and initiate video generation', async () => {
    const request: GenerateVideoRequest = {
      prompt: 'A graceful ballerina performing on an empty stage',
      subject: {
        appearance: 'Slender, dark hair in a bun',
        clothing: 'White tutu and satin slippers',
      },
      options: {
        duration: 5,
        aspectRatio: '16:9',
      },
    };

    const result = await service.generateVideo(request);

    expect(result.jobId).toBeDefined();
    expect(result.status).toBe('queued');
    expect(result.provider).toBe('mock');
    expect(result.prompt).toContain('User request:\nA graceful ballerina');
    expect(result.prompt).toContain('White tutu');
  });

  it('should retrieve updated status for an existing job', async () => {
    const request: GenerateVideoRequest = {
      prompt: 'A drone flying through the Swiss Alps',
    };

    const initial = await service.generateVideo(request);
    expect(initial.jobId).toBeDefined();

    const status1 = await service.getVideoStatus(initial.jobId);
    expect(status1.status).toBe('processing');

    const status2 = await service.getVideoStatus(initial.jobId);
    expect(status2.status).toBe('processing');

    const status3 = await service.getVideoStatus(initial.jobId);
    expect(status3.status).toBe('completed');
    expect(status3.videoUrl).toBeDefined();
  });

  it('should poll until completion with generateAndWait', async () => {
    const request: GenerateVideoRequest = {
      prompt: 'Cinematic sunrise over Manhattan skyline',
    };

    const completed = await service.generateAndWait(request, 10000, 50);

    expect(completed.status).toBe('completed');
    expect(completed.videoUrl).toBeDefined();
    expect(completed.progress).toBe(100);
  });

  it('should preview prompt without sending to provider', () => {
    const request: GenerateVideoRequest = {
      prompt: 'A chef garnishing a gourmet dish with microgreens',
      scene: {
        location: 'Three-star Michelin kitchen',
      },
    };

    const preview = service.previewPrompt(request);

    expect(preview.prompt).toContain(
      'Create a realistic video based on the following description.',
    );
    expect(preview.prompt).toContain('Three-star Michelin kitchen');
    expect(preview.prompt).toContain(
      'A chef garnishing a gourmet dish with microgreens',
    );
    expect(preview.validatedRequest.prompt).toBe(request.prompt);
  });

  it('should translate provider rate limits to HTTP 429', async () => {
    jest
      .spyOn(mockProvider, 'generateVideo')
      .mockRejectedValueOnce(new Error('Provider rate limit reached'));

    await expect(
      service.generateVideo({ prompt: 'Test prompt for rate limit' }),
    ).rejects.toThrow(HttpException);

    try {
      await service.generateVideo({ prompt: 'Test prompt for rate limit' });
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });
});
