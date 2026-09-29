import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  CuratedItineraryItem,
  GroupMember,
  Guest,
  GuestItinerary,
  ItinerarySwipe,
  SharedPlan,
  StayProfile,
} from '../entities';
import { ProfileService } from '../profile/profile.service';
import { EventsService } from '../events/events.service';
import { computeMatch, MatchLookups } from './match-score';

export type SwipeAction = 'pass' | 'join';
const SWIPE_ACTIONS: SwipeAction[] = ['pass', 'join'];

@Injectable()
export class CirclesService {
  constructor(
    @InjectRepository(GuestItinerary)
    private readonly itineraryRepo: Repository<GuestItinerary>,
    @InjectRepository(ItinerarySwipe)
    private readonly swipeRepo: Repository<ItinerarySwipe>,
    @InjectRepository(StayProfile)
    private readonly profileRepo: Repository<StayProfile>,
    @InjectRepository(Guest)
    private readonly guestRepo: Repository<Guest>,
    @InjectRepository(SharedPlan)
    private readonly sharedPlanRepo: Repository<SharedPlan>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepo: Repository<GroupMember>,
    private readonly profileService: ProfileService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Other guests' itineraries ranked by preference match, excluding the
   * guest's own itinerary, anything already swiped, hosts who opted out of
   * guest circles, and itineraries with no spots left.
   */
  async getFeed(guestId: number, limit = 10) {
    const swiped = await this.swipeRepo.find({ where: { guestId } });
    const excludedIds = swiped.map((s) => s.itineraryId);

    const candidates = await this.itineraryRepo.find({
      where: {
        guestId: Not(guestId),
        ...(excludedIds.length ? { id: Not(In(excludedIds)) } : {}),
      },
    });

    const cards = await this.buildCards(guestId, candidates);
    return cards
      .filter((card) => card.host.openToGuestCircles && card.spotsRemaining > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent)
      .slice(0, limit);
  }

  /** Records a pass or join. Either way the itinerary leaves the feed. */
  async swipe(guestId: number, itineraryId: number, action: SwipeAction) {
    if (!SWIPE_ACTIONS.includes(action)) {
      throw new BadRequestException(
        `action must be one of: ${SWIPE_ACTIONS.join(', ')}`,
      );
    }
    if (!Number.isInteger(itineraryId)) {
      throw new BadRequestException('itineraryId must be a number');
    }

    const itinerary = await this.itineraryRepo.findOne({
      where: { id: itineraryId },
    });
    if (!itinerary) {
      throw new NotFoundException(`Itinerary ${itineraryId} not found`);
    }
    if (itinerary.guestId === guestId) {
      throw new BadRequestException('You cannot swipe on your own itinerary');
    }

    const existing = await this.swipeRepo.findOne({
      where: { guestId, itineraryId },
    });
    const wasJoined = existing?.action === 'join';

    if (action === 'join' && !wasJoined) {
      const joined = await this.swipeRepo.count({
        where: { itineraryId, action: 'join' },
      });
      if (joined >= itinerary.spotsTotal) {
        throw new ConflictException('No spots remaining for this itinerary');
      }
    }

    const swipe = existing
      ? this.swipeRepo.merge(existing, { action })
      : this.swipeRepo.create({ guestId, itineraryId, action });
    await this.swipeRepo.save(swipe);

    if (action === 'join' && !wasJoined) {
      await this.addToHostGroup(guestId, itinerary);
    } else if (action === 'pass' && wasJoined) {
      await this.removeFromHostGroup(guestId, itinerary);
    }

    const [card] = await this.buildCards(guestId, [itinerary]);
    return { swipe, itinerary: card };
  }

  /** Itineraries this guest has confirmed attendance for. */
  async getJoined(guestId: number) {
    const joins = await this.swipeRepo.find({
      where: { guestId, action: 'join' },
      order: { updatedAt: 'DESC' },
    });
    if (!joins.length) return [];
    const joinOrder = joins.map((j) => j.itineraryId);
    const itineraries = await this.itineraryRepo.find({
      where: { id: In(joinOrder) },
    });
    // Most recently joined first
    itineraries.sort(
      (a, b) => joinOrder.indexOf(a.id) - joinOrder.indexOf(b.id),
    );
    return this.buildCards(guestId, itineraries);
  }

  /** Clears all of a guest's swipes (and circle memberships) — for demos. */
  async resetSwipes(guestId: number) {
    const swipes = await this.swipeRepo.find({ where: { guestId } });
    const joinedIds = swipes
      .filter((s) => s.action === 'join')
      .map((s) => s.itineraryId);
    if (joinedIds.length) {
      const itineraries = await this.itineraryRepo.find({
        where: { id: In(joinedIds) },
      });
      for (const itinerary of itineraries) {
        await this.removeFromHostGroup(guestId, itinerary);
      }
    }
    await this.swipeRepo.delete({ guestId });
    return { cleared: swipes.length };
  }

  private async buildCards(viewerId: number, itineraries: GuestItinerary[]) {
    if (!itineraries.length) return [];

    const hostIds = [...new Set(itineraries.map((i) => i.guestId))];
    const itineraryIds = itineraries.map((i) => i.id);

    const [viewerProfile, hostProfiles, hosts, joins, lookups] =
      await Promise.all([
        this.profileService.getProfile(viewerId),
        this.profileRepo.find({ where: { guestId: In(hostIds) } }),
        this.guestRepo.find({ where: { id: In(hostIds) } }),
        this.swipeRepo.find({
          where: { itineraryId: In(itineraryIds), action: 'join' },
        }),
        this.getLookups(),
      ]);

    const profileByGuest = new Map(hostProfiles.map((p) => [p.guestId, p]));
    const hostById = new Map(hosts.map((h) => [h.id, h]));
    const joinCount = new Map<number, number>();
    for (const join of joins) {
      joinCount.set(
        join.itineraryId,
        (joinCount.get(join.itineraryId) || 0) + 1,
      );
    }

    return itineraries.map((itinerary) => {
      const hostPrefs =
        profileByGuest.get(itinerary.guestId)?.preferences || {};
      const host = hostById.get(itinerary.guestId);
      const match = computeMatch(viewerProfile.preferences, hostPrefs, lookups);
      const highlight = this.pickHighlight(itinerary.items || []);
      const moodTags = (hostPrefs.atmosphereMoodIds || [])
        .map((id: number) => lookups.atmospheres.get(Number(id)))
        .filter(Boolean);

      return {
        itineraryId: itinerary.id,
        matchPercent: match.matchPercent,
        matchBreakdown: match.breakdown,
        matchReasons: match.reasons,
        host: {
          guestId: itinerary.guestId,
          name: host?.name,
          profileImage: host?.profileImage,
          suiteLabel: itinerary.suiteLabel,
          openToGuestCircles: hostPrefs.openToGuestCircles === true,
        },
        title: itinerary.title,
        tagline: itinerary.tagline,
        itineraryDate: itinerary.itineraryDate,
        posterUrl: itinerary.posterUrl,
        videoUrl: itinerary.videoUrl,
        inviteMessage: itinerary.inviteMessage,
        spotsTotal: itinerary.spotsTotal,
        spotsRemaining: Math.max(
          0,
          itinerary.spotsTotal - (joinCount.get(itinerary.id) || 0),
        ),
        highlight,
        tags: highlight?.tags?.length ? highlight.tags : moodTags,
      };
    });
  }

  /** The item a card features: first open item, else the last item. */
  private pickHighlight(items: CuratedItineraryItem[]) {
    return items.find((i) => i.status === 'open') || items[items.length - 1];
  }

  private async getLookups(): Promise<MatchLookups> {
    const options = await this.profileService.getOptions();
    const toMap = (rows: { id: number; name: string }[]) =>
      new Map(rows.map((r) => [r.id, r.name]));
    return {
      atmospheres: toMap(options.atmosphereAndMood),
      cadences: toMap(options.itineraryCadence),
      travelCompanies: toMap(options.travelCompany),
    };
  }

  /** The host's shared plan backing this itinerary's circle, created on demand. */
  private async findCirclePlan(itinerary: GuestItinerary, create: boolean) {
    const plans = await this.sharedPlanRepo.find({
      where: { ownerId: itinerary.guestId },
    });
    const existing = plans.find(
      (p) => p.planDetails?.itineraryId === itinerary.id,
    );
    if (existing || !create) return existing;
    return this.sharedPlanRepo.save(
      this.sharedPlanRepo.create({
        ownerId: itinerary.guestId,
        planDetails: { scope: 'circle', itineraryId: itinerary.id },
      }),
    );
  }

  private async addToHostGroup(guestId: number, itinerary: GuestItinerary) {
    const plan = await this.findCirclePlan(itinerary, true);
    const member = await this.groupMemberRepo.findOne({
      where: { groupId: plan.id, guestId },
    });
    if (!member) {
      await this.groupMemberRepo.save(
        this.groupMemberRepo.create({
          groupId: plan.id,
          guestId,
          role: 'member',
        }),
      );
    }

    const guest = await this.guestRepo.findOne({ where: { id: guestId } });
    await this.eventsService.emit(
      itinerary.guestId,
      'circle_joined',
      `${guest?.name || 'A guest'} joined your circle`,
      `${guest?.name || 'A guest'} confirmed attendance for "${itinerary.title}".`,
    );
  }

  private async removeFromHostGroup(
    guestId: number,
    itinerary: GuestItinerary,
  ) {
    const plan = await this.findCirclePlan(itinerary, false);
    if (plan) {
      await this.groupMemberRepo.delete({ groupId: plan.id, guestId });
    }
  }
}
