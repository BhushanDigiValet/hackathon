import { ConfigService } from '@nestjs/config';
import { VideoProviderFactory } from './provider.factory';
import { MockVideoProvider } from './mock.provider';
import { LumaProvider } from './luma.provider';
import { RunwayProvider } from './runway.provider';
import { PikaProvider } from './pika.provider';
import { GoogleVeoProvider } from './google-veo.provider';

describe('Video Providers and Factory', () => {
  describe('MockVideoProvider', () => {
    let mockProvider: MockVideoProvider;

    beforeEach(() => {
      mockProvider = new MockVideoProvider();
    });

    it('should generate a video job with queued status', async () => {
      const response = await mockProvider.generateVideo('A cat drinking milk');
      expect(response.jobId).toBeDefined();
      expect(response.status).toBe('queued');
    });

    it('should simulate async progress from queued -> processing -> completed', async () => {
      const { jobId } = await mockProvider.generateVideo('A tranquil river');

      // First check: processing
      const check1 = await mockProvider.checkStatus(jobId);
      expect(check1.status).toBe('processing');
      expect(check1.progress).toBe(30);

      // Second check: processing (75%)
      const check2 = await mockProvider.checkStatus(jobId);
      expect(check2.status).toBe('processing');
      expect(check2.progress).toBe(75);

      // Third check: completed (100%)
      const check3 = await mockProvider.checkStatus(jobId);
      expect(check3.status).toBe('completed');
      expect(check3.progress).toBe(100);
      expect(check3.videoUrl).toBeDefined();
      expect(check3.videoUrl).toMatch(/^https:\/\//);
    });

    it('should simulate failure when prompt includes [fail]', async () => {
      const { jobId } = await mockProvider.generateVideo(
        'Simulate error condition [fail]',
      );
      const check = await mockProvider.checkStatus(jobId);
      expect(check.status).toBe('failed');
      expect(check.error).toContain('Simulated external AI video provider');
    });
  });

  describe('Real Provider Instantiation & Validation', () => {
    it('should reject LumaProvider without API key', () => {
      expect(() => new LumaProvider('')).toThrow('API key is required');
    });

    it('should reject RunwayProvider without API key', () => {
      expect(() => new RunwayProvider('')).toThrow('API key is required');
    });

    it('should reject PikaProvider without API key', () => {
      expect(() => new PikaProvider('')).toThrow('API key is required');
    });

    it('should reject GoogleVeoProvider without API key', () => {
      expect(() => new GoogleVeoProvider('')).toThrow('API key is required');
    });
  });

  describe('VideoProviderFactory', () => {
    it('should fallback to mock provider when no API key is provided', () => {
      const configServiceMock = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'VIDEO_PROVIDER') return 'luma';
          if (key === 'VIDEO_PROVIDER_API_KEY') return '';
          return undefined;
        }),
      } as unknown as ConfigService;

      const factory = new VideoProviderFactory(configServiceMock);
      const provider = factory.getProvider();
      expect(provider.name).toBe('mock');
    });

    it('should resolve LumaProvider when key is present', () => {
      const configServiceMock = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'VIDEO_PROVIDER') return 'luma';
          if (key === 'VIDEO_PROVIDER_API_KEY') return 'test-luma-key';
          return undefined;
        }),
      } as unknown as ConfigService;

      const factory = new VideoProviderFactory(configServiceMock);
      const provider = factory.getProvider();
      expect(provider.name).toBe('luma');
    });

    it('should allow registering a custom provider', () => {
      const configServiceMock = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'VIDEO_PROVIDER') return 'custom_provider';
          if (key === 'VIDEO_PROVIDER_API_KEY') return 'test-key';
          return undefined;
        }),
      } as unknown as ConfigService;

      const factory = new VideoProviderFactory(configServiceMock);
      factory.registerProvider('custom_provider', () => ({
        name: 'custom_provider',
        generateVideo: jest
          .fn()
          .mockResolvedValue({ jobId: 'cust-123', status: 'queued' }),
        checkStatus: jest.fn().mockResolvedValue({
          jobId: 'cust-123',
          status: 'completed',
          prompt: '',
          provider: 'custom_provider',
          createdAt: '',
          updatedAt: '',
        }),
      }));

      const provider = factory.getProvider();
      expect(provider.name).toBe('custom_provider');
    });
  });
});
