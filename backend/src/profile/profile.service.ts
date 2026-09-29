import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StayProfile } from '../entities';
import { AiService } from '../ai/ai.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(StayProfile)
    private readonly profileRepo: Repository<StayProfile>,
    private readonly aiService: AiService,
    private readonly eventsService: EventsService,
  ) {}

  async getProfile(guestId: number) {
    let profile = await this.profileRepo.findOne({ where: { guestId } });
    if (!profile) {
      profile = this.profileRepo.create({ guestId, preferences: {} });
      await this.profileRepo.save(profile);
    }
    return profile;
  }

  async updateProfile(guestId: number, patch: any) {
    const profile = await this.getProfile(guestId);
    profile.preferences = { ...profile.preferences, ...patch };
    await this.profileRepo.save(profile);
    return profile;
  }

  async extract(guestId: number, prompt: string, selections: any) {
    let result = await this.aiService.extractProfile(prompt, selections);
    if (!result) {
      // Keyword fallback
      const tags = new Set<string>();
      let wellness = 0,
        fine_dining = 0,
        social = 0,
        sunset = 0,
        nightlife = 0,
        wine = 0,
        adventure = 0;

      const p = prompt.toLowerCase();
      if (p.includes('spa') || p.includes('relax')) {
        tags.add('wellness');
        tags.add('spa');
        wellness += 1;
      }
      if (p.includes('dinner') || p.includes('food')) {
        tags.add('fine_dining');
        fine_dining += 1;
      }
      if (p.includes('social') || p.includes('people') || p.includes('meet')) {
        tags.add('social');
        tags.add('sunset');
        tags.add('nightlife');
        tags.add('wine');
        tags.add('adventure');
        social += 1;
        sunset += 1;
        nightlife += 1;
        wine += 1;
        adventure += 1;
      }

      const mood = selections?.mood?.[0] || 'relaxed';

      result = {
        tags: Array.from(tags),
        weights: {
          wellness,
          fine_dining,
          social,
          sunset,
          nightlife,
          wine,
          adventure,
        },
        mood,
        summary:
          'A slow, indulgent day built around wellness, great food and a social evening.',
      };
    }

    // Explicit selections override
    if (selections) {
      if (selections.pace) result.pace = selections.pace;
      if (selections.travelMode) result.travelMode = selections.travelMode;
      if (selections.socialOptIn !== undefined)
        result.socialOptIn = selections.socialOptIn;
      if (selections.wakeAfter) result.wakeAfter = selections.wakeAfter;
      if (selections.budgetTier) result.budgetTier = selections.budgetTier;
    }

    const patch = {
      ...result,
      rawPrompt: prompt,
    };

    const profile = await this.updateProfile(guestId, patch);
    await this.eventsService.emit(
      guestId,
      'profile_extracted',
      'Profile Extracted',
      prompt,
    );
    return profile;
  }
}
