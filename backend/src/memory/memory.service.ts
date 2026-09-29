import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MemoryReel,
  StayPlanItem,
  CatalogueItem,
  StayProfile,
} from '../entities';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MemoryService {
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
    reel.narration = JSON.stringify(result);
    reel.mediaUrls = result.chapters; // simple mock
    await this.memoryRepo.save(reel);

    return result;
  }

  async getMemory(guestId: number) {
    const reel = await this.memoryRepo.findOne({ where: { guestId } });
    if (!reel) return null;
    return {
      ...reel,
      narration: reel.narration ? JSON.parse(reel.narration) : null,
    };
  }
}
