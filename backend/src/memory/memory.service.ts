import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MemoryReel,
  StayPlanItem,
  CatalogueItem,
  StayProfile,
} from '../entities';
import { AiService } from '../ai/ai.service';
import { VideoGenerationService } from '../video/video-generation.service';
import { VideoGenerationResult } from '../video/interfaces/video-generation.interface';

type ReelVideo = Pick<
  VideoGenerationResult,
  'jobId' | 'status' | 'provider' | 'videoUrl' | 'thumbnailUrl' | 'error'
>;

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectRepository(MemoryReel)
    private readonly memoryRepo: Repository<MemoryReel>,
    @InjectRepository(StayPlanItem)
    private readonly planRepo: Repository<StayPlanItem>,
    @InjectRepository(CatalogueItem)
    private readonly catalogueRepo: Repository<CatalogueItem>,
    @InjectRepository(StayProfile)
    private readonly profileRepo: Repository<StayProfile>,
    private readonly aiService: AiService,
    private readonly videoService: VideoGenerationService,
  ) {}

  async narrate(guestId: number) {
    const profile = await this.profileRepo.findOne({ where: { guestId } });
    const allItems = await this.planRepo.find({ where: { guestId } });

    // items with state confirmed/shared/pending
    const validStates = ['confirmed', 'shared', 'pending'];
    const timelineIds = allItems
      .filter((i) => validStates.includes(i.details?.state))
      .sort((a, b) =>
        (a.details?.startAt || '').localeCompare(b.details?.startAt || ''),
      );

    const catalogue = await this.catalogueRepo.find();

    const timeline = timelineIds.map((t) => {
      const cat = catalogue.find((c) => c.id === t.catalogueItemId);
      return { ...t, catalogueItem: cat };
    });

    let result = await this.aiService.narrateMemory(timeline, profile);

    if (!result) {
      // Fallback
      const chapters = timeline.map((t) => {
        const name = t.catalogueItem?.name || 'an experience';
        const group = t.catalogueItem?.details?.categoryGroup;
        let text = `You enjoyed ${name}.`;

        if (group === 'spa' || group === 'wellness')
          text = `The day slowed down at ${name}.`;
        if (group === 'dining' || group === 'food')
          text = `Dinner at ${name} was the evening's anchor.`;
        if (t.details?.state === 'shared')
          text = `You shared ${name} with fellow guests.`;

        return {
          time: t.details?.startAt,
          text,
          category: group,
        };
      });

      result = {
        title: 'Your Vegas escape',
        chapters,
        closingLine:
          "Don't tell us what you want to book. Tell us how you want your stay to feel.",
      };
    }

    let reel = await this.memoryRepo.findOne({ where: { guestId } });
    if (!reel) {
      reel = this.memoryRepo.create({ guestId });
    }
    const video = await this.startReelVideo(result);
    reel.narration = JSON.stringify(result);
    reel.mediaUrls = { chapters: result.chapters, video };
    await this.memoryRepo.save(reel);

    return { ...result, video };
  }

  async getMemory(guestId: number) {
    const reel = await this.memoryRepo.findOne({ where: { guestId } });
    if (!reel) return null;

    // Refresh a reel video that was still rendering when narrated.
    const video: ReelVideo | undefined = reel.mediaUrls?.video;
    if (
      video?.jobId &&
      (video.status === 'queued' || video.status === 'processing')
    ) {
      try {
        const latest = await this.videoService.getVideoStatus(video.jobId);
        reel.mediaUrls = { ...reel.mediaUrls, video: this.toReelVideo(latest) };
        await this.memoryRepo.save(reel);
      } catch (err: any) {
        this.logger.warn(`Reel video status check failed: ${err.message}`);
      }
    }

    return {
      ...reel,
      narration: reel.narration ? JSON.parse(reel.narration) : null,
    };
  }

  /** Kicks off the keepsake video; never blocks or fails the narration. */
  private async startReelVideo(result: {
    title: string;
    chapters: any[];
    closingLine?: string;
  }): Promise<ReelVideo | null> {
    if (!result.chapters?.length) return null;
    try {
      const job = await this.videoService.generateVideo({
        prompt:
          `A keepsake reel of a luxury resort stay: ${result.title}. ${result.chapters
            .map((c) => c.text)
            .join(' ')}`.slice(0, 2900),
        reel: {
          title: result.title,
          chapters: result.chapters.slice(0, 20),
          closingLine: result.closingLine,
        },
        options: { aspectRatio: '16:9', style: 'warm cinematic' },
      });
      return this.toReelVideo(job);
    } catch (err: any) {
      this.logger.warn(`Reel video generation failed: ${err.message}`);
      return null;
    }
  }

  private toReelVideo(job: VideoGenerationResult): ReelVideo {
    return {
      jobId: job.jobId,
      status: job.status,
      provider: job.provider,
      videoUrl: job.videoUrl,
      thumbnailUrl: job.thumbnailUrl,
      error: job.error,
    };
  }
}
