import { Test, TestingModule } from '@nestjs/testing';
import { VideoGenerationController } from './video-generation.controller';
import { VideoGenerationService } from './video-generation.service';
import { VideoProviderFactory } from './providers/provider.factory';
import {
  GenerateVideoRequest,
  VideoGenerationResult,
} from './interfaces/video-generation.interface';

describe('VideoGenerationController', () => {
  let controller: VideoGenerationController;
  let service: VideoGenerationService;
  let factory: VideoProviderFactory;

  const mockResult: VideoGenerationResult = {
    jobId: 'test-job-123',
    status: 'queued',
    prompt: 'A sunset view',
    provider: 'mock',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoGenerationController],
      providers: [
        {
          provide: VideoGenerationService,
          useValue: {
            generateVideo: jest.fn().mockResolvedValue(mockResult),
            getVideoStatus: jest.fn().mockResolvedValue({
              ...mockResult,
              status: 'completed',
              videoUrl: 'https://example.com/video.mp4',
            }),
            generateAndWait: jest.fn().mockResolvedValue({
              ...mockResult,
              status: 'completed',
              videoUrl: 'https://example.com/video.mp4',
            }),
            previewPrompt: jest.fn().mockReturnValue({
              prompt: 'Built prompt text',
              validatedRequest: { prompt: 'A sunset view' },
            }),
            getJobHistory: jest.fn().mockReturnValue([mockResult]),
          },
        },
        {
          provide: VideoProviderFactory,
          useValue: {
            getProvider: jest.fn().mockReturnValue({ name: 'mock' }),
            getAvailableProviders: jest
              .fn()
              .mockReturnValue(['mock', 'luma', 'runway', 'pika']),
          },
        },
      ],
    }).compile();

    controller = module.get<VideoGenerationController>(
      VideoGenerationController,
    );
    service = module.get<VideoGenerationService>(VideoGenerationService);
    factory = module.get<VideoProviderFactory>(VideoProviderFactory);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /generate should call service.generateVideo', async () => {
    const request: GenerateVideoRequest = {
      prompt: 'A golden sunset over mountains',
    };
    const res = await controller.generateVideo(request);

    expect(service.generateVideo).toHaveBeenCalledWith(request);
    expect(res.jobId).toBe('test-job-123');
  });

  it('GET /status/:jobId should return status', async () => {
    const res = await controller.getStatus('test-job-123');

    expect(service.getVideoStatus).toHaveBeenCalledWith('test-job-123');
    expect(res.status).toBe('completed');
    expect(res.videoUrl).toBe('https://example.com/video.mp4');
  });

  it('POST /preview-prompt should return preview', () => {
    const res = controller.previewPrompt({ prompt: 'A sunset view' });

    expect(service.previewPrompt).toHaveBeenCalled();
    expect(res.prompt).toBe('Built prompt text');
  });

  it('GET /providers should return active and available providers without secrets', () => {
    const res = controller.getProviders();

    expect(factory.getProvider).toHaveBeenCalled();
    expect(factory.getAvailableProviders).toHaveBeenCalled();
    expect(res.activeProvider).toBe('mock');
    expect(res.availableProviders).toEqual(['mock', 'luma', 'runway', 'pika']);
    expect((res as any).apiKey).toBeUndefined();
  });
});
