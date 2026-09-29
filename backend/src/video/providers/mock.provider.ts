import {
  IVideoProvider,
  VideoGenerationOptions,
  VideoGenerationResult,
  VideoJobStatus,
} from '../interfaces/video-generation.interface';

interface MockJobRecord {
  jobId: string;
  prompt: string;
  options?: VideoGenerationOptions;
  status: VideoJobStatus;
  progress: number;
  checksCount: number;
  createdAt: string;
  updatedAt: string;
  simulateFailure?: boolean;
}

export class MockVideoProvider implements IVideoProvider {
  public readonly name = 'mock';
  private readonly jobs = new Map<string, MockJobRecord>();

  /**
   * Sample high quality demo videos for realistic playback preview.
   */
  private readonly sampleVideos = [
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
    'https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_1MB.mp4'
  ];

  /**
   * Initiates a mock video generation job.
   */
  public async generateVideo(
    builtPrompt: string,
    options?: VideoGenerationOptions,
  ): Promise<{
    jobId: string;
    status: VideoJobStatus;
    metadata?: Record<string, any>;
  }> {
    const jobId = `mock_vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const simulateFailure = builtPrompt.toLowerCase().includes('[fail]');

    this.jobs.set(jobId, {
      jobId,
      prompt: builtPrompt,
      options,
      status: 'queued',
      progress: 0,
      checksCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      simulateFailure,
    });

    return {
      jobId,
      status: 'queued',
      metadata: {
        provider: 'mock-simulation',
        estimatedSeconds: 6,
      },
    };
  }

  /**
   * Simulates asynchronous progress and completion upon status checks.
   */
  public async checkStatus(jobId: string): Promise<VideoGenerationResult> {
    const job = this.jobs.get(jobId);
    const nowIso = new Date().toISOString();

    if (!job) {
      return {
        jobId,
        status: 'failed',
        prompt: '',
        provider: this.name,
        error: `Job with ID ${jobId} not found in mock provider`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }

    job.checksCount += 1;
    job.updatedAt = nowIso;

    // Check for simulated failure
    if (job.simulateFailure) {
      job.status = 'failed';
      return {
        jobId,
        status: 'failed',
        prompt: job.prompt,
        provider: this.name,
        error: 'Simulated external AI video provider generation failure',
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    }

    // Progress simulation through lifecycle:
    // Check 1: queued (0%) -> processing (30%)
    // Check 2: processing (75%)
    // Check 3+: completed (100%)
    if (job.checksCount === 1) {
      job.status = 'processing';
      job.progress = 30;
    } else if (job.checksCount === 2) {
      job.status = 'processing';
      job.progress = 75;
    } else {
      job.status = 'completed';
      job.progress = 100;
    }

    const videoSampleIndex =
      Math.abs(this.hashCode(jobId)) % this.sampleVideos.length;
    const isCompleted = job.status === 'completed';

    return {
      jobId,
      status: job.status,
      prompt: job.prompt,
      provider: this.name,
      progress: job.progress,
      videoUrl: isCompleted ? this.sampleVideos[videoSampleIndex] : undefined,
      thumbnailUrl: isCompleted
        ? 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800'
        : undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: isCompleted ? nowIso : undefined,
      options: job.options,
      metadata: {
        simulation: true,
        cycles: job.checksCount,
      },
    };
  }

  public async cancelGeneration(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
