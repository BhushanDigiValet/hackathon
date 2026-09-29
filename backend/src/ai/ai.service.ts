import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogueItem, StayPlanItem } from '../entities';
import { DemoCache } from './demo-cache';
import {
  ALLOWED_PROFILE_TAGS,
  EXTRACT_PROFILE_LLM_CONFIG,
  EXTRACT_PROFILE_SYSTEM_PROMPT,
  buildExtractProfilePrompt,
} from './prompts/extract-profile.prompt';
import {
  COMPOSE_PLAN_LLM_CONFIG,
  COMPOSE_PLAN_SYSTEM_PROMPT,
  buildComposePlanPrompt,
} from './prompts/compose-plan.prompt';
import {
  RESHAPE_PLAN_LLM_CONFIG,
  RESHAPE_PLAN_SYSTEM_PROMPT,
  buildReshapePlanPrompt,
} from './prompts/reshape-plan.prompt';
import {
  NARRATE_MEMORY_LLM_CONFIG,
  NARRATE_MEMORY_SYSTEM_PROMPT,
  buildNarrateMemoryPrompt,
} from './prompts/narrate-memory.prompt';

export interface LlmCallOptions {
  timeoutMs?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface ComposedPlanItem {
  catalogueItemId: number;
  startAt: string;
  endAt: string;
  why: string;
  upsellItemId?: number;
  upsellReason?: string;
}

export type ComposePlanResult = ComposedPlanItem[] & {
  planSummary?: string;
  items?: ComposedPlanItem[];
};

export interface ReshapedPlanResult {
  understood: string | boolean;
  changes: string[];
  profilePatch: any;
  items: ComposedPlanItem[];
}

export interface NarratedMemoryChapter {
  time?: string;
  title?: string;
  text: string;
  category?: string;
}

export interface NarratedMemoryResult {
  title: string;
  chapters: any[];
  closingLine: string;
}

// -------------------------------------------------------------
// Time Utility Helpers
// -------------------------------------------------------------
function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return 0;
  }
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutesToTime(timeStr: string, durationMin: number): string {
  return minutesToTime(timeToMinutes(timeStr) + durationMin);
}

function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  return a1 < b2 && b1 < a2;
}

@Injectable()
export class AiService {
  private demoCache = new DemoCache();

  constructor(
    private configService: ConfigService,
    @Optional()
    @InjectRepository(CatalogueItem)
    private catalogueRepo?: Repository<CatalogueItem>,
  ) {}

  /**
   * Converts guest text and explicit selections into a structured profile.
   * Target settings: timeout 8000ms, maxTokens 600, temperature 0.2
   */
  async extractProfile(prompt: string, selections: any): Promise<any | null> {
    const startTime = Date.now();
    try {
      if (!prompt && !selections) {
        console.warn('[ai] extractProfile failed: missing prompt and selections');
        return null;
      }

      // 1. Check Demo Cache
      const cacheKey = { prompt, selections: selections || {} };
      const cached = await this.demoCache.get<any>('extractProfile', cacheKey);
      if (cached) {
        console.log(`[ai] extract ${((Date.now() - startTime) / 1000).toFixed(1)}s (cached)`);
        return cached;
      }

      // 2. Call LLM
      const userMessage = buildExtractProfilePrompt(prompt, selections);
      const parsed = await this.callLlm(
        EXTRACT_PROFILE_SYSTEM_PROMPT,
        userMessage,
        EXTRACT_PROFILE_LLM_CONFIG,
      );

      // 3. Light shape check
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.mood ||
        !parsed.pace ||
        !parsed.travelMode ||
        typeof parsed.summary !== 'string'
      ) {
        console.warn('[ai] extractProfile failed: invalid shape from LLM', parsed);
        return null;
      }

      // 4. Force explicit selections over model values
      const sel = selections || {};
      if (sel.pace) parsed.pace = sel.pace;
      if (sel.travelMode) parsed.travelMode = sel.travelMode;
      if (sel.socialOptIn !== undefined) {
        parsed.socialOptIn = Boolean(sel.socialOptIn);
      }
      if (sel.mood) {
        parsed.mood = Array.isArray(sel.mood) ? sel.mood[0] : sel.mood;
      }
      if (sel.moods && Array.isArray(sel.moods) && sel.moods.length > 0) {
        parsed.mood = sel.moods[0];
      }

      // Constraints overrides and defaults
      parsed.constraints = parsed.constraints || {};
      if (sel.wakeAfter) parsed.constraints.wakeAfter = sel.wakeAfter;
      if (sel.budgetTier) parsed.constraints.budgetTier = Number(sel.budgetTier);

      const mode = (parsed.travelMode || 'solo').toLowerCase();
      if (!parsed.constraints.partySize) {
        parsed.constraints.partySize =
          mode === 'solo' ? 1 : mode === 'couple' ? 2 : 4;
      }
      if (!parsed.constraints.wakeAfter) {
        parsed.constraints.wakeAfter = '09:00';
      }
      if (!parsed.constraints.budgetTier) {
        parsed.constraints.budgetTier = 3;
      }

      // Clamp weights (0 to 1)
      const weights: Record<string, number> = {};
      const rawWeights = parsed.weights || {};
      const weightKeys = [
        'wellness',
        'food',
        'nightlife',
        'exploration',
        'luxury',
        'energy',
      ];
      for (const k of weightKeys) {
        const val = Number(rawWeights[k]);
        weights[k] = isNaN(val) ? 0.5 : Math.max(0, Math.min(1, val));
      }
      parsed.weights = weights;

      // Filter tags to allowed list (3 to 8 tags)
      const allowedSet = new Set<string>(ALLOWED_PROFILE_TAGS);
      const rawTags: string[] = Array.isArray(parsed.tags) ? parsed.tags : [];
      let filteredTags = rawTags
        .map((t) => t.toLowerCase().trim().replace(/\s+/g, '_'))
        .filter((t) => allowedSet.has(t));

      if (filteredTags.length < 3) {
        if (weights.wellness >= 0.6) filteredTags.push('wellness', 'spa');
        if (weights.food >= 0.6) filteredTags.push('fine_dining');
        if (weights.nightlife >= 0.5) filteredTags.push('cocktails', 'nightlife');
        if (parsed.socialOptIn) filteredTags.push('social');
        filteredTags = Array.from(new Set(filteredTags)).filter((t) =>
          allowedSet.has(t),
        );
      }
      parsed.tags = filteredTags.slice(0, 8);

      // Clean summary (second person, no exclamation marks)
      parsed.summary = parsed.summary
        .replace(/!+/g, '.')
        .replace(/\s+/g, ' ')
        .trim();

      // Top-level aliases for backwards compatibility with profile.service.ts
      parsed.wakeAfter = parsed.constraints.wakeAfter;
      parsed.budgetTier = parsed.constraints.budgetTier;

      // 5. Cache and log
      this.demoCache.set('extractProfile', cacheKey, parsed);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[ai] extract ${elapsed}s`);

      return parsed;
    } catch (error) {
      console.warn('[ai] extractProfile failed', error);
      return null;
    }
  }

  /**
   * Composes a cohesive daily plan using candidate items and respecting locked items.
   * Target settings: timeout 12000ms, maxTokens 1500, temperature 0.5
   */
  async composePlan(
    profile: any,
    candidates: CatalogueItem[],
    lockedItems: StayPlanItem[] | any[],
  ): Promise<ComposePlanResult | null> {
    const startTime = Date.now();
    try {
      if (!candidates || candidates.length === 0) {
        console.warn('[ai] composePlan failed: no candidates provided');
        return null;
      }

      // 1. Fetch upgrades from catalogue repository if available
      let allCatalogue: CatalogueItem[] = candidates;
      if (this.catalogueRepo) {
        try {
          allCatalogue = await this.catalogueRepo.find();
        } catch {
          allCatalogue = candidates;
        }
      }

      // 2. Build compact catalogue with upgrade items attached
      const compactCatalogue = candidates.map((item) => {
        const details = item.details || {};

        // Find items that are upsells of this candidate
        const upgrades = allCatalogue
          .filter((cat) => cat.details?.upsellOfId === item.id)
          .map((u) => ({
            id: u.id,
            name: u.name,
            price: Number(u.price) || 0,
          }));

        return {
          id: item.id,
          name: item.name,
          category: details.categoryGroup || 'experience',
          subcategory: details.subcategory || details.categoryGroup || '',
          price: Number(item.price) || 0,
          priceTier:
            details.priceTier ||
            (Number(item.price) > 250
              ? 4
              : Number(item.price) > 150
                ? 3
                : Number(item.price) > 60
                  ? 2
                  : 1),
          durationMin: details.durationMin || 60,
          openFrom: details.openFrom || '08:00',
          openTo: details.openTo || '23:00',
          tags: details.tags || [],
          blurb: (item.description || '').slice(0, 100),
          upgrades,
        };
      });

      // 3. Compact locked items
      const lockedList = lockedItems || [];
      const compactLocked = lockedList.map((l: any) => ({
        catalogueItemId: l.catalogueItemId,
        name: l.catalogueItem?.name || l.name || 'Confirmed Experience',
        startAt: l.details?.startAt || l.startAt || '12:00',
        endAt: l.details?.endAt || l.endAt || '13:00',
      }));

      // 4. Check Demo Cache
      const cacheKey = {
        profileMood: profile?.mood,
        profilePace: profile?.pace,
        rawPrompt: profile?.rawPrompt,
        lockedIds: compactLocked.map((l) => l.catalogueItemId).sort(),
      };
      const cached = await this.demoCache.get<any>('composePlan', cacheKey);
      if (cached) {
        console.log(`[ai] compose ${((Date.now() - startTime) / 1000).toFixed(1)}s (cached)`);
        return this.wrapComposeResult(cached.planSummary, cached.items);
      }

      // 5. Call LLM
      const userMessage = buildComposePlanPrompt(
        profile,
        compactCatalogue,
        compactLocked,
      );
      const parsed = await this.callLlm(
        COMPOSE_PLAN_SYSTEM_PROMPT,
        userMessage,
        COMPOSE_PLAN_LLM_CONFIG,
      );

      // 6. Light shape check
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.planSummary !== 'string' ||
        !Array.isArray(parsed.items)
      ) {
        console.warn('[ai] composePlan failed: invalid response shape from LLM', parsed);
        return null;
      }

      // 7. Filter, validate and normalize items
      const seenIds = new Set<number>();
      for (const l of compactLocked) {
        if (l.catalogueItemId) seenIds.add(l.catalogueItemId);
      }

      const cleanItems: ComposedPlanItem[] = [];
      const compactLookup = new Map(compactCatalogue.map((c) => [c.id, c]));

      for (const it of parsed.items) {
        const id = Number(it.catalogueItemId);
        if (!compactLookup.has(id) || seenIds.has(id)) continue;
        seenIds.add(id);

        const cat = compactLookup.get(id)!;
        const startAt = it.startAt || cat.openFrom || '10:00';
        let endAt = it.endAt;
        if (!endAt) {
          endAt = addMinutesToTime(startAt, cat.durationMin || 60);
        }

        // Validate upsellItemId against valid upgrades
        let upsellItemId = it.upsellItemId ? Number(it.upsellItemId) : undefined;
        let upsellReason = it.upsellReason;
        if (upsellItemId) {
          const isValid = cat.upgrades.some((u) => u.id === upsellItemId);
          if (!isValid) {
            upsellItemId = undefined;
            upsellReason = undefined;
          }
        }

        // Sanitize voice: max 22 words for why, max 18 words for upsellReason
        const why = (it.why || 'Chosen to suit the rhythm of your day.')
          .replace(/!+/g, '.')
          .split(' ')
          .slice(0, 22)
          .join(' ');

        if (upsellReason) {
          upsellReason = upsellReason
            .replace(/!+/g, '.')
            .split(' ')
            .slice(0, 18)
            .join(' ');
        }

        cleanItems.push({
          catalogueItemId: id,
          startAt,
          endAt,
          why,
          upsellItemId,
          upsellReason,
        });
      }

      // Sort by start time
      cleanItems.sort((a, b) => a.startAt.localeCompare(b.startAt));

      // Rule: If fewer than 3 items remain, return null
      if (cleanItems.length < 3) {
        console.warn('[ai] composePlan failed: fewer than 3 items after filtering');
        return null;
      }

      const planSummary = parsed.planSummary.replace(/!+/g, '.').trim();
      const resultObj = { planSummary, items: cleanItems };

      // 8. Cache and log
      this.demoCache.set('composePlan', cacheKey, resultObj);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[ai] compose ${elapsed}s`);

      return this.wrapComposeResult(planSummary, cleanItems);
    } catch (error) {
      console.warn('[ai] composePlan failed', error);
      return null;
    }
  }

  /**
   * Reshapes an existing itinerary according to guest request message.
   * Target settings: timeout 10000ms, maxTokens 1500, temperature 0.3
   */
  async reshapePlan(
    message: string,
    profile: any,
    currentItems: any[],
    candidates: CatalogueItem[],
  ): Promise<ReshapedPlanResult | null> {
    const startTime = Date.now();
    try {
      if (!message) {
        console.warn('[ai] reshapePlan failed: empty message');
        return null;
      }

      const allItems = currentItems || [];
      const lockedItems = allItems.filter(
        (it) => it.details?.state !== 'suggested' && it.state !== 'suggested',
      );

      // 1. Candidate lookup map
      const candidateLookup = new Map<number, CatalogueItem>();
      (candidates || []).forEach((c) => candidateLookup.set(c.id, c));

      // 2. Format current items with locked indicators and accurate names
      const formattedCurrent = allItems.map((it) => {
        const isLocked =
          it.details?.state !== 'suggested' && it.state !== 'suggested';
        const name =
          it.catalogueItem?.name ||
          it.name ||
          candidateLookup.get(it.catalogueItemId)?.name ||
          'Itinerary Item';
        return {
          catalogueItemId: it.catalogueItemId,
          name,
          startAt: it.details?.startAt || it.startAt,
          endAt: it.details?.endAt || it.endAt,
          state: it.details?.state || it.state || 'suggested',
          isLocked,
        };
      });

      // 3. Compact candidate catalogue
      const compactLookup = new Map<number, any>();
      const compactCatalogue = (candidates || []).map((c) => {
        const d = c.details || {};
        const item = {
          id: c.id,
          name: c.name,
          category: d.categoryGroup || 'experience',
          price: Number(c.price) || 0,
          priceTier: d.priceTier || (Number(c.price) > 200 ? 4 : 2),
          durationMin: d.durationMin || 60,
          openFrom: d.openFrom || '08:00',
          openTo: d.openTo || '23:00',
          tags: d.tags || [],
          blurb: (c.description || '').slice(0, 100),
        };
        compactLookup.set(c.id, item);
        return item;
      });

      // 4. Check Demo Cache
      const cacheKey = {
        message: message.trim(),
        profileMood: profile?.mood,
        lockedIds: lockedItems.map((l) => l.catalogueItemId).sort(),
      };
      const cached = await this.demoCache.get<ReshapedPlanResult>(
        'reshapePlan',
        cacheKey,
      );
      if (cached) {
        console.log(`[ai] reshape ${((Date.now() - startTime) / 1000).toFixed(1)}s (cached)`);
        return cached;
      }

      // 5. Call LLM
      const userMessage = buildReshapePlanPrompt(
        message,
        profile,
        formattedCurrent,
        compactCatalogue,
      );
      const parsed = await this.callLlm(
        RESHAPE_PLAN_SYSTEM_PROMPT,
        userMessage,
        RESHAPE_PLAN_LLM_CONFIG,
      );

      // 6. Light shape check
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.changes) ||
        !Array.isArray(parsed.items)
      ) {
        console.warn('[ai] reshapePlan failed: invalid response shape from LLM', parsed);
        return null;
      }

      // 7. Filter unlocked items against candidates and drop overlaps with locked items
      const seenIds = new Set<number>();
      for (const l of lockedItems) {
        if (l.catalogueItemId) seenIds.add(l.catalogueItemId);
      }

      const cleanItems: ComposedPlanItem[] = [];
      for (const it of parsed.items) {
        const id = Number(it.catalogueItemId);
        if (!compactLookup.has(id) || seenIds.has(id)) continue;

        const cat = compactLookup.get(id);
        const startAt = it.startAt || cat.openFrom || '10:00';
        let endAt = it.endAt;
        if (!endAt) {
          endAt = addMinutesToTime(startAt, cat.durationMin || 60);
        }

        // Drop if overlapping any locked item
        const overlapsLocked = lockedItems.some((l) => {
          const lStart = l.details?.startAt || l.startAt;
          const lEnd = l.details?.endAt || l.endAt;
          return lStart && lEnd && timesOverlap(startAt, endAt, lStart, lEnd);
        });
        if (overlapsLocked) continue;

        seenIds.add(id);

        const why = (it.why || 'Updated to match your request.')
          .replace(/!+/g, '.')
          .split(' ')
          .slice(0, 22)
          .join(' ');

        cleanItems.push({
          catalogueItemId: id,
          startAt,
          endAt,
          why,
          upsellItemId: it.upsellItemId ? Number(it.upsellItemId) : undefined,
          upsellReason: it.upsellReason,
        });
      }

      cleanItems.sort((a, b) => a.startAt.localeCompare(b.startAt));

      // Rule: If items is empty and no changes, return null
      if (cleanItems.length === 0 && parsed.changes.length === 0) {
        console.warn('[ai] reshapePlan failed: no changes and items empty');
        return null;
      }

      const understoodText = (
        typeof parsed.understood === 'string'
          ? parsed.understood
          : 'Your day has been updated.'
      )
        .replace(/!+/g, '.')
        .trim();

      const result: ReshapedPlanResult = {
        understood: understoodText,
        changes: parsed.changes.map((c: string) => String(c).replace(/!+/g, '.')),
        profilePatch: parsed.profilePatch || {},
        items: cleanItems,
      };

      // 8. Cache and log
      this.demoCache.set('reshapePlan', cacheKey, result);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[ai] reshape ${elapsed}s`);

      return result;
    } catch (error) {
      console.warn('[ai] reshapePlan failed', error);
      return null;
    }
  }

  /**
   * Crafts an evocative narrative keepsake from a guest's completed timeline.
   * Target settings: timeout 10000ms, maxTokens 1200, temperature 0.8
   */
  async narrateMemory(
    timeline: any[],
    profile: any,
  ): Promise<NarratedMemoryResult | null> {
    const startTime = Date.now();
    try {
      if (!timeline || timeline.length === 0) {
        console.warn('[ai] narrateMemory failed: empty timeline');
        return null;
      }

      // 1. Format timeline entries cleanly
      const formattedTimeline = timeline.map((t) => ({
        time: t.time || t.details?.startAt || '12:00',
        name: t.name || t.catalogueItem?.name || 'Resort Experience',
        category:
          t.category || t.catalogueItem?.details?.categoryGroup || 'experience',
        state: t.state || t.details?.state || 'confirmed',
        shared: Boolean(
          t.shared || t.details?.state === 'shared' || t.state === 'shared',
        ),
      }));

      // 2. Check Demo Cache
      const cacheKey = {
        timelineCount: formattedTimeline.length,
        profileMood: profile?.mood,
        timelineNames: formattedTimeline.map((t) => t.name),
      };
      const cached = await this.demoCache.get<NarratedMemoryResult>(
        'narrateMemory',
        cacheKey,
      );
      if (cached) {
        console.log(`[ai] memory ${((Date.now() - startTime) / 1000).toFixed(1)}s (cached)`);
        return cached;
      }

      // 3. Call LLM
      const userMessage = buildNarrateMemoryPrompt(formattedTimeline, profile);
      const parsed = await this.callLlm(
        NARRATE_MEMORY_SYSTEM_PROMPT,
        userMessage,
        NARRATE_MEMORY_LLM_CONFIG,
      );

      // 4. Light shape check
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.title !== 'string' ||
        !Array.isArray(parsed.chapters) ||
        typeof parsed.closingLine !== 'string'
      ) {
        console.warn('[ai] narrateMemory failed: invalid response shape from LLM', parsed);
        return null;
      }

      // Rule: chapters.length must equal timeline.length (otherwise return null)
      if (parsed.chapters.length !== formattedTimeline.length) {
        console.warn(
          `[ai] narrateMemory failed: chapters length (${parsed.chapters.length}) does not match timeline length (${formattedTimeline.length})`,
        );
        return null;
      }

      // Copy time and category from timeline, not from model
      const validatedChapters: NarratedMemoryChapter[] = parsed.chapters.map(
        (ch: any, idx: number) => {
          const original = formattedTimeline[idx];
          const text = (ch.text || '')
            .replace(/!+/g, '.')
            .split(' ')
            .slice(0, 35)
            .join(' ');

          return {
            time: original.time,
            title: (ch.title || 'A quiet moment').replace(/!+/g, '.').trim(),
            text,
            category: original.category,
          };
        },
      );

      const title = parsed.title.replace(/!+/g, '.').trim();
      const closingLine = parsed.closingLine.replace(/!+/g, '.').trim();

      const result: NarratedMemoryResult = {
        title,
        chapters: validatedChapters,
        closingLine,
      };

      // 5. Cache and log
      this.demoCache.set('narrateMemory', cacheKey, result);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[ai] memory ${elapsed}s`);

      return result;
    } catch (error) {
      console.warn('[ai] narrateMemory failed', error);
      return null;
    }
  }

  /**
   * Helper that wraps composePlan output as array with { planSummary, items } properties
   * so both `result.items`, `result.planSummary`, and array iteration/indexing work!
   */
  private wrapComposeResult(
    planSummary: string,
    items: ComposedPlanItem[],
  ): ComposePlanResult {
    const arr = [...items] as any;
    arr.planSummary = planSummary;
    arr.items = items;
    return arr as ComposePlanResult;
  }

  /**
   * Core LLM invocation helper supporting configurable timeout, token limits, and temperature.
   */
  private async callLlm(
    system: string,
    user: string,
    options?: LlmCallOptions | number,
  ): Promise<any | null> {
    const disableLlm = this.configService.get<string>('DISABLE_LLM');
    if (disableLlm === 'true' || disableLlm === '1' || disableLlm === 'on') {
      return null;
    }

    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey || apiKey === 'disabled' || apiKey === 'off' || !apiKey.trim()) {
      return null;
    }

    const timeoutMs =
      typeof options === 'number' ? options : options?.timeoutMs ?? 10000;
    const maxTokens =
      typeof options === 'object' && options?.maxTokens !== undefined
        ? options.maxTokens
        : 2000;
    const temperature =
      typeof options === 'object' ? options?.temperature : undefined;

    const model =
      this.configService.get<string>('LLM_MODEL') || 'claude-sonnet-5-5';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payload: any = {
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      };
      if (temperature !== undefined) {
        payload.temperature = temperature;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal as any,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[ai] callLlm HTTP error ${response.status}: ${errorText}`);
        return null;
      }

      const data = await response.json();
      const text = data.content
        ?.filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      if (!text) return null;

      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) return null;

      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    } catch (e: any) {
      console.warn('[ai] callLlm failed', e?.message || e);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
