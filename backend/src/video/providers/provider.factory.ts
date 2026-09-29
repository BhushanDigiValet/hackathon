import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IVideoProvider } from '../interfaces/video-generation.interface';
import { LumaProvider } from './luma.provider';
import { RunwayProvider } from './runway.provider';
import { PikaProvider } from './pika.provider';
import { MockVideoProvider } from './mock.provider';
import { GoogleVeoProvider } from './google-veo.provider';
import { LocalReelProvider } from './local-reel.provider';
import { join } from 'path';

@Injectable()
export class VideoProviderFactory {
  private readonly logger = new Logger(VideoProviderFactory.name);
  private readonly registry = new Map<
    string,
    (apiKey: string, baseUrl?: string) => IVideoProvider
  >();
  private activeProviderInstance: IVideoProvider | null = null;

  constructor(private readonly configService: ConfigService) {
    // Register built-in providers
    this.registerProvider('luma', (key, url) => new LumaProvider(key, url));
    this.registerProvider('runway', (key, url) => new RunwayProvider(key, url));
    this.registerProvider('pika', (key, url) => new PikaProvider(key, url));
    this.registerProvider('gemini', (key) => new GoogleVeoProvider(key));
    this.registerProvider('veo', (key) => new GoogleVeoProvider(key));
    this.registerProvider('mock', () => new MockVideoProvider());
    this.registerProvider(
      'local',
      () =>
        new LocalReelProvider(
          // Same folder ServeStaticModule serves (backend/public), from src/ or dist/.
          join(__dirname, '..', '..', '..', 'public'),
          (
            this.configService.get<string>('VIDEO_PUBLIC_BASE_URL') ||
            `http://localhost:${this.configService.get<string>('PORT') || 3000}`
          ).replace(/\/+$/, ''),
        ),
    );
  }

  /**
   * Registers a new or custom video provider implementation.
   * Enables adding new providers dynamically without changing core service logic.
   */
  public registerProvider(
    name: string,
    factoryFn: (apiKey: string, baseUrl?: string) => IVideoProvider,
  ): void {
    this.registry.set(name.toLowerCase(), factoryFn);
    this.logger.log(`Registered AI video provider: ${name}`);
  }

  /**
   * Resolves and returns the configured provider instance based on environment configuration.
   */
  public getProvider(): IVideoProvider {
    if (this.activeProviderInstance) {
      return this.activeProviderInstance;
    }

    const configuredProvider = (
      this.configService.get<string>('VIDEO_PROVIDER') ||
      process.env.VIDEO_PROVIDER ||
      ''
    )
      .toLowerCase()
      .trim();

    const apiKey = (
      this.configService.get<string>('VIDEO_PROVIDER_API_KEY') ||
      process.env.VIDEO_PROVIDER_API_KEY ||
      ''
    ).trim();

    const baseUrl =
      this.configService.get<string>('VIDEO_PROVIDER_BASE_URL') ||
      process.env.VIDEO_PROVIDER_BASE_URL ||
      undefined;

    // Keyless providers ('local', 'mock') need no API key. Any other provider without a key
    // falls back to 'local', which renders a real reel from itinerary data.
    const keyless = new Set(['local', 'mock']);
    let targetProviderName = configuredProvider || (apiKey ? 'luma' : 'local');

    if (!apiKey && !keyless.has(targetProviderName)) {
      this.logger.warn(
        `VIDEO_PROVIDER_API_KEY is not configured for provider '${targetProviderName}'. Falling back to 'local' reel renderer.`,
      );
      targetProviderName = 'local';
    }

    const factoryFn = this.registry.get(targetProviderName);
    if (!factoryFn) {
      const available = Array.from(this.registry.keys()).join(', ');
      throw new Error(
        `Unknown AI video provider: '${targetProviderName}'. Available providers: [${available}]`,
      );
    }

    this.activeProviderInstance = factoryFn(apiKey, baseUrl);
    this.logger.log(
      `Active AI Video Provider initialized: ${this.activeProviderInstance.name}`,
    );

    return this.activeProviderInstance;
  }

  /**
   * Returns the list of registered provider names.
   */
  public getAvailableProviders(): string[] {
    return Array.from(this.registry.keys());
  }
}
