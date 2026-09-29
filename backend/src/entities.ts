import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * Represents a registered user or guest in the system.
 * This table stores basic identity and contact information.
 */
@Entity('guest')
export class Guest {
  /** Unique auto-incrementing identifier for the guest */
  @PrimaryGeneratedColumn()
  id: number;

  /** Full name of the guest */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** Unique email address used for authentication and contact */
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  /** URL of the guest's profile image (avatar) */
  @Column({ type: 'varchar', length: 512, nullable: true })
  profileImage: string;

  /** Timestamp of when the guest record was created */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the guest record was last modified */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Stores the specific preferences, constraints, and AI-extracted profile
 * data for a guest's stay. Used extensively by the planning AI.
 */
@Entity('stay_profile')
export class StayProfile {
  /** Unique identifier for the profile record */
  @PrimaryGeneratedColumn()
  id: number;

  /** The ID of the guest this profile belongs to */
  @Column()
  guestId: number;

  /**
   * JSON payload containing detailed preferences like budgetTier, pace,
   * extracted tags, category weights, and raw AI prompt strings.
   */
  @Column({ type: 'json', nullable: true })
  preferences: any;

  /** Timestamp of when the profile was first generated */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the profile was last updated (e.g. from reshapes) */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Represents a bookable service, experience, or dining option
 * available at the resort (e.g. Spa treatments, dinner reservations).
 */
@Entity('catalogue_item')
export class CatalogueItem {
  /** Unique identifier for the catalogue item */
  @PrimaryGeneratedColumn()
  id: number;

  /** The display name of the item (e.g., 'Ember & Oak') */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** Detailed description of what the experience entails */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** The base cost of the item before party-size multipliers */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  /**
   * JSON payload containing specific operational data like categoryGroup,
   * tags, openFrom/openTo times, durationMin, and upsellOfId references.
   */
  @Column({ type: 'json', nullable: true })
  details: any;

  /** Timestamp of when the catalogue item was added */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the catalogue item was last updated */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Represents a scheduled slot in a guest's personalized itinerary.
 * Links a guest to a specific CatalogueItem at a specific time.
 */
@Entity('stay_plan_item')
export class StayPlanItem {
  /** Unique identifier for the itinerary item */
  @PrimaryGeneratedColumn()
  id: number;

  /** The ID of the guest this itinerary item belongs to */
  @Column()
  guestId: number;

  /** The ID of the CatalogueItem scheduled in this slot */
  @Column()
  catalogueItemId: number;

  /**
   * JSON payload containing scheduling specifics such as startAt, endAt,
   * state ('suggested', 'pending', 'confirmed'), the 'why' template string,
   * and linked upsell references.
   */
  @Column({ type: 'json', nullable: true })
  details: any;

  /** Timestamp of when this plan item was created */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when this plan item state or details were updated */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Represents an active reservation request for a specific PlanItem.
 * Used to track the booking pipeline and calculate total costs.
 */
@Entity('booking_request')
export class BookingRequest {
  /** Unique identifier for the booking request */
  @PrimaryGeneratedColumn()
  id: number;

  /** The ID of the guest who initiated the booking */
  @Column()
  guestId: number;

  /**
   * JSON payload containing the planItemId, partySize, totalPrice
   * (including upsells), guestIntent, and boolean withUpsell flag.
   */
  @Column({ type: 'json', nullable: true })
  requestDetails: any;

  /** Current state of the booking (e.g. 'pending', 'confirmed', 'failed') */
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string;

  /** Timestamp of when the booking request was initiated */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the booking status was last changed */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Represents an itinerary that has been shared with other guests.
 * Facilitates multi-user collaboration and visibility on the same plan.
 */
@Entity('shared_plan')
export class SharedPlan {
  /** Unique identifier for the shared plan */
  @PrimaryGeneratedColumn()
  id: number;

  /** The guest ID of the primary owner who created and shared the plan */
  @Column()
  ownerId: number;

  /** JSON payload tracking metadata about the sharing settings and scope */
  @Column({ type: 'json', nullable: true })
  planDetails: any;

  /** Timestamp of when the plan was first shared */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the shared plan was updated */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Tracks the delivery state of a finalized plan to the guest
 * (e.g., sent via email, SMS, or app notification).
 */
@Entity('plan_delivery')
export class PlanDelivery {
  /** Unique identifier for the delivery record */
  @PrimaryGeneratedColumn()
  id: number;

  /** The ID of the shared plan or primary plan being delivered */
  @Column()
  planId: number;

  /** Current state of the delivery (e.g. 'pending', 'sent', 'delivered') */
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  deliveryStatus: string;

  /** Timestamp of when the delivery was queued */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the delivery status was updated */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Links a guest to a shared group, establishing their role
 * and permissions within a collaborative itinerary.
 */
@Entity('group_member')
export class GroupMember {
  /** Unique identifier for the membership record */
  @PrimaryGeneratedColumn()
  id: number;

  /** The ID of the group or shared plan being joined */
  @Column()
  groupId: number;

  /** The ID of the guest who is a member of the group */
  @Column()
  guestId: number;

  /** The permission level or role of the member (e.g. 'owner', 'member', 'viewer') */
  @Column({ type: 'varchar', length: 50, default: 'member' })
  role: string;

  /** Timestamp of when the guest joined the group */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the guest's role was last changed */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * An audit trail or activity log tracking notable actions a guest takes.
 * Can be used for analytics, debugging, or displaying a history feed.
 */
@Entity('guest_event')
export class GuestEvent {
  /** Unique identifier for the event log */
  @PrimaryGeneratedColumn()
  id: number;

  /** The ID of the guest associated with the event */
  @Column()
  guestId: number;

  /** Categorical type of the event (e.g., 'profile_extracted', 'plan_generated') */
  @Column({ type: 'varchar', length: 255 })
  type: string;

  /** A short human-readable title for the event */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** Extended textual details, payload, or explanation of the event */
  @Column({ type: 'text', nullable: true })
  body: string;

  /** Optional URL or deep link to the resource associated with the event */
  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string;

  /** Timestamp of when the event occurred */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the event log was modified (rarely used) */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * A post-stay narrative or 'recap' generated by the AI, summarizing
 * the guest's booked itinerary as a memorable story with chapters.
 */
@Entity('memory_reel')
export class MemoryReel {
  /** Unique identifier for the memory reel */
  @PrimaryGeneratedColumn()
  id: number;

  /** The ID of the guest the reel belongs to */
  @Column()
  guestId: number;

  /** JSON array of media URLs or chapter assets associated with the timeline */
  @Column({ type: 'json', nullable: true })
  mediaUrls: any;

  /** The fully generated AI story text stringified as JSON */
  @Column({ type: 'text', nullable: true })
  narration: string;

  /** Timestamp of when the memory reel was generated */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the memory reel was last updated */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Centralized array exporting all TypeORM entities for easy injection
 * into the DatabaseModule's TypeOrmModule.forFeature() call.
 */

/**
 * Master table for Atmosphere and Mood options.
 */
@Entity('master_atmosphere')
export class MasterAtmosphere {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ default: true })
  isActive: boolean;
}

/**
 * Master table for Itinerary Cadence (Pace) options.
 */
@Entity('master_cadence')
export class MasterCadence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;
}

/**
 * Master table for Travel Company options (companions).
 */
@Entity('master_travel_company')
export class MasterTravelCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string;

  @Column({ default: true })
  isActive: boolean;
}

/**
 * A single timeline entry shown on the guest's curated itinerary screen
 * (e.g. "15:00 · Arrival & In-Suite Welcome Prelude").
 */
export interface CuratedItineraryItem {
  /** Display start time, 24h format (e.g. '18:00') */
  time: string;
  /** Machine-readable state (e.g. 'confirmed', 'open', 'pending') */
  status: string;
  /** Badge text shown on the card (e.g. 'Confirmed', 'Open Lounge') */
  statusLabel: string;
  /** Venue line in caps (e.g. 'Lake of Dreams Terrace') */
  location: string;
  /** Optional duration text appended to the venue line (e.g. '90 min') */
  durationLabel?: string;
  /** Card headline */
  title: string;
  /** Card body copy */
  description: string;
  /** Optional hero image for the card */
  imageUrl?: string;
  /** Optional caption overlaid on the image (e.g. 'Table 4 · Lakeside View') */
  imageCaption?: string;
  /** Italic personalised note explaining why this was chosen */
  note?: string;
  /** Small footer text (e.g. 'Suite ready at 14:30', 'Dress Code: Resort Chic') */
  footerText?: string;
  /** Footer call-to-action label (e.g. 'Host Details', 'View Menu') */
  actionLabel?: string;
  /** Optional chips shown on invitation cards (e.g. 'Acoustic Jazz') */
  tags?: string[];
}

/**
 * The guest's current curated itinerary: the cinematic poster/video
 * preview plus the day's timeline. A guest has at most one at a time.
 */
@Entity('guest_itinerary')
export class GuestItinerary {
  /** Unique identifier for the itinerary */
  @PrimaryGeneratedColumn()
  id: number;

  /** The guest who owns this itinerary (one itinerary per guest) */
  @Column({ unique: true })
  guestId: number;

  /** Headline shown on the preview card (e.g. 'Your Curated Journey') */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** Italic tagline under the section heading */
  @Column({ type: 'varchar', length: 512, nullable: true })
  tagline: string;

  /** Suite label shown in the preview badge (e.g. 'Suite 1204') */
  @Column({ type: 'varchar', length: 100, nullable: true })
  suiteLabel: string;

  /** The day this itinerary covers */
  @Column({ type: 'date', nullable: true })
  itineraryDate: string;

  /** Poster image URL for the cinematic preview card */
  @Column({ type: 'varchar', length: 1024, nullable: true })
  posterUrl: string;

  /** Video URL played when the guest taps "Watch" */
  @Column({ type: 'varchar', length: 1024, nullable: true })
  videoUrl: string;

  /** Ordered timeline entries (see CuratedItineraryItem) */
  @Column({ type: 'json', nullable: true })
  items: CuratedItineraryItem[];

  /** How many other guests can join this itinerary via Guest Circles */
  @Column({ type: 'int', default: 4 })
  spotsTotal: number;

  /** Host's personal invitation quote shown on the circles card */
  @Column({ type: 'text', nullable: true })
  inviteMessage: string;

  /** Timestamp of when the itinerary was created */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of when the itinerary was last updated */
  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * A guest's swipe decision on another guest's itinerary in the Guest
 * Circles feed. Any swiped itinerary is excluded from that guest's feed.
 */
@Entity('itinerary_swipe')
@Unique(['guestId', 'itineraryId'])
export class ItinerarySwipe {
  /** Unique identifier for the swipe */
  @PrimaryGeneratedColumn()
  id: number;

  /** The guest who swiped */
  @Column()
  guestId: number;

  /** The GuestItinerary that was swiped on */
  @Column()
  itineraryId: number;

  /** 'pass' (never show again) or 'join' (confirmed attendance) */
  @Column({ type: 'varchar', length: 10 })
  action: 'pass' | 'join';

  /** Timestamp of the first swipe */
  @CreateDateColumn()
  createdAt: Date;

  /** Timestamp of the latest swipe change */
  @UpdateDateColumn()
  updatedAt: Date;
}

export const ALL_ENTITIES = [
  Guest,
  StayProfile,
  CatalogueItem,
  StayPlanItem,
  BookingRequest,
  SharedPlan,
  PlanDelivery,
  GroupMember,
  GuestEvent,
  MemoryReel,
  MasterAtmosphere,
  MasterCadence,
  MasterTravelCompany,
  GuestItinerary,
  ItinerarySwipe,
];
