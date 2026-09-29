import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { StayPlanItem, CatalogueItem, StayProfile } from '../entities';
import { AiService } from '../ai/ai.service';
import { ProfileService } from '../profile/profile.service';
import { EventsService } from '../events/events.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PlanService {
  private inMemoryProposals = new Map<string, any>();

  constructor(
    @InjectRepository(StayPlanItem) private readonly planRepo: Repository<StayPlanItem>,
    @InjectRepository(CatalogueItem) private readonly catalogueRepo: Repository<CatalogueItem>,
    private readonly profileService: ProfileService,
    private readonly aiService: AiService,
    private readonly eventsService: EventsService,
  ) {}

  private getCategoryGroupMap() {
    return {
      spa: 'wellness', fitness: 'wellness',
      dining: 'food', bar: 'food', in_room: 'food',
      nightlife: 'nightlife', show: 'nightlife',
      experience: 'exploration', pool: 'exploration', shopping: 'exploration',
    };
  }

  async scoreCandidates(profile: any, catalogue: CatalogueItem[]) {
    const prefs = profile.preferences || {};
    const weights = prefs.weights || {};
    const profileTags = prefs.tags || [];
    const budgetTier = prefs.budgetTier || 2;
    const catMap = this.getCategoryGroupMap();

    const scored = catalogue.map(item => {
      if (item.details?.upsellOfId) return null;

      const group = catMap[item.details?.categoryGroup] || 'exploration';
      const weight = weights[group] || 0;

      const itemTags = item.details?.tags || [];
      const overlap = itemTags.filter(t => profileTags.includes(t)).length;
      const tagOverlapRatio = itemTags.length > 0 ? overlap / itemTags.length : 0;

      const price = item.price || 0;
      const priceTier = price < 100 ? 1 : price < 250 ? 2 : 3;
      const budgetScore = priceTier <= budgetTier ? 0.1 : -0.2;

      const score = (weight * 0.5) + (tagOverlapRatio * 0.4) + budgetScore;
      return { item, score };
    }).filter(x => x !== null);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 25).map(x => x.item);
  }

  async fallbackCompose(profile: any, candidates: CatalogueItem[], lockedItems: any[], allCatalogue: CatalogueItem[]) {
    const prefs = profile.preferences || {};
    const pace = prefs.pace || 'balanced';
    const wakeAfter = prefs.wakeAfter || '08:00';

    let slots = [
      { time: '10:00', type: 'breakfast' }, // mapped to dining early
      { time: '11:30', type: 'spa' },
      { time: '14:00', type: 'pool' },
      { time: '18:00', type: 'bar' },
      { time: '20:00', type: 'dining' },
      { time: '22:30', type: 'nightlife' },
    ];
    if (pace === 'balanced' || pace === 'packed') {
      slots.splice(3, 0, { time: '16:00', type: 'experience' });
    }
    if (pace === 'packed') {
      slots.splice(6, 0, { time: '21:30', type: 'show' });
    }

    const proposed = [];
    const usedIds = new Set(lockedItems.map(l => l.catalogueItemId));

    for (const slot of slots) {
      if (slot.time < wakeAfter) slot.time = wakeAfter;
      // Skip if overlaps locked item (simple check on time)
      const overlaps = lockedItems.some(l => l.details?.startAt === slot.time);
      if (overlaps) continue;

      // find best candidate
      let best = null;
      for (const cand of candidates) {
        if (usedIds.has(cand.id)) continue;
        const cg = cand.details?.categoryGroup;
        // map slot type to categoryGroup
        const isMatch = (slot.type === 'breakfast' && cg === 'dining' && cand.details?.openFrom <= '10:00') ||
                        (slot.type === cg) ||
                        (slot.type === 'pool' && cand.details?.tags?.includes('pool'));
        
        if (isMatch) {
          best = cand;
          break;
        }
      }

      if (best) {
        usedIds.add(best.id);
        const duration = best.details?.durationMin || 60;
        
        // check for upsell
        const upsell = allCatalogue.find(c => c.details?.upsellOfId === best.id);
        
        proposed.push({
          catalogueItemId: best.id,
          startAt: slot.time,
          endAt: 'TBD', // simplified end time
          why: `Picked because you asked for something relaxing and indulgent`, // template
          upsellItemId: upsell ? upsell.id : undefined,
          upsellReason: upsell ? `You have time, so a longer experience fits without rushing` : undefined
        });
      }
    }
    return proposed;
  }

  async toPlanView(guestId: number) {
    const items = await this.planRepo.find({ where: { guestId } });
    const catalogue = await this.catalogueRepo.find();
    
    return items.map(item => {
      const catItem = catalogue.find(c => c.id === item.catalogueItemId);
      const upsellItem = item.details?.upsellItemId ? catalogue.find(c => c.id === item.details.upsellItemId) : null;
      return {
        ...item,
        catalogueItem: catItem,
        upsellItem,
      };
    }).sort((a, b) => (a.details?.startAt || '').localeCompare(b.details?.startAt || ''));
  }

  async generate(guestId: number) {
    const profile = await this.profileService.getProfile(guestId);
    const allCatalogue = await this.catalogueRepo.find();
    const candidates = await this.scoreCandidates(profile, allCatalogue);
    
    const existing = await this.planRepo.find({ where: { guestId } });
    const locked = existing.filter(e => e.details?.state !== 'suggested');
    
    let plan = await this.aiService.composePlan(profile, candidates, locked);
    if (!plan || plan.length < 3) {
      plan = await this.fallbackCompose(profile, candidates, locked, allCatalogue);
    }
    
    // delete existing suggested
    await this.planRepo.delete({ guestId, details: { state: 'suggested' } as any });
    
    // insert new
    for (const p of plan) {
      const entity = this.planRepo.create({
        guestId,
        catalogueItemId: p.catalogueItemId,
        details: {
          startAt: p.startAt,
          endAt: p.endAt,
          why: p.why,
          upsellItemId: p.upsellItemId,
          upsellReason: p.upsellReason,
          state: 'suggested',
          source: 'fallback'
        }
      });
      await this.planRepo.save(entity);
    }

    await this.profileService.updateProfile(guestId, { planSummary: "You wanted a slow, luxurious day, so we kept the afternoon open after your spa." });
    await this.eventsService.emit(guestId, 'plan_generated', 'Plan Generated');
    
    return this.toPlanView(guestId);
  }

  async reshape(guestId: number, message: string) {
    const profile = await this.profileService.getProfile(guestId);
    const existing = await this.planRepo.find({ where: { guestId } });
    const allCatalogue = await this.catalogueRepo.find();
    const candidates = await this.scoreCandidates(profile, allCatalogue);

    let result = await this.aiService.reshapePlan(message, profile, existing, candidates);
    
    if (!result) {
      // Fallback
      let prefs = { ...profile.preferences };
      let weights = prefs.weights || {};
      const tags = new Set(prefs.tags || []);
      const changes = [];
      const msg = message.toLowerCase();

      if (msg.includes('social') || msg.includes('people')) {
        tags.add('social'); tags.add('nightlife');
        weights.nightlife = (weights.nightlife || 0) + 0.3;
      }
      if (msg.includes('casual') || msg.includes('cheaper') || msg.includes('cheap')) {
        prefs.budgetTier = Math.max(1, (prefs.budgetTier || 2) - 1);
      }
      if (msg.includes('adventur')) {
        weights.exploration = (weights.exploration || 0) + 0.3;
        tags.add('adventure');
      }
      if (msg.includes('relax') || msg.includes('quiet')) {
        weights.wellness = (weights.wellness || 0) + 0.2;
        weights.nightlife = (weights.nightlife || 0) - 0.2;
      }
      if (msg.includes('before 10') || msg.includes('sleep in') || msg.includes('wake')) {
        prefs.wakeAfter = '10:00';
      }

      prefs.weights = weights;
      prefs.tags = Array.from(tags);
      
      const locked = existing.filter(e => e.details?.state !== 'suggested');
      const newPlan = await this.fallbackCompose({ ...profile, preferences: prefs }, candidates, locked, allCatalogue);
      
      result = {
        understood: true,
        changes: ['Adjusted based on your feedback'],
        profilePatch: prefs,
        items: newPlan
      };
    }

    const proposalId = uuidv4();
    this.inMemoryProposals.set(proposalId, result);

    return {
      proposalId,
      understood: result.understood,
      changes: result.changes,
      proposed: result.items
    };
  }

  async acceptReshape(guestId: number, proposalId: string) {
    const proposal = this.inMemoryProposals.get(proposalId);
    if (!proposal) throw new Error('Proposal not found');

    await this.profileService.updateProfile(guestId, proposal.profilePatch);
    
    // delete old suggested
    // NOTE: using a raw query or find first to avoid typeorm json column issues
    const items = await this.planRepo.find({ where: { guestId } });
    for (const item of items) {
      if (item.details?.state === 'suggested') {
        await this.planRepo.remove(item);
      }
    }

    // insert new
    for (const p of proposal.items) {
      const entity = this.planRepo.create({
        guestId,
        catalogueItemId: p.catalogueItemId,
        details: {
          startAt: p.startAt,
          endAt: p.endAt,
          why: p.why,
          upsellItemId: p.upsellItemId,
          upsellReason: p.upsellReason,
          state: 'suggested',
          source: 'reshape'
        }
      });
      await this.planRepo.save(entity);
    }
    
    this.inMemoryProposals.delete(proposalId);
    return this.toPlanView(guestId);
  }

  async deleteItem(guestId: number, itemId: number) {
    const item = await this.planRepo.findOne({ where: { id: itemId, guestId } });
    if (item && item.details?.state === 'suggested') {
      await this.planRepo.remove(item);
    }
    return this.toPlanView(guestId);
  }
}
