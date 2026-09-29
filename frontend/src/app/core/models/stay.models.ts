/** Shared guest context shown in headers across screens. */
export interface GuestContext {
  suite: string;
  concierge: string;
}

// ---------------------------------------------------------------------------
// Welcome & personalization
// ---------------------------------------------------------------------------

export interface SelectableOption {
  id: number;
  label: string;
}

export interface PaceOption extends SelectableOption {
  description: string;
}

export interface TravelCompanyOption extends SelectableOption {
  icon: string;
}

export interface RefinedPreference {
  id: string;
  label: string;
  hint: string;
  value: string;
}

export type SynthesisStepState = 'done' | 'active' | 'pending';

export interface SynthesisStep {
  label: string;
  state: SynthesisStepState;
}

export interface PersonalizationOptions {
  moods: SelectableOption[];
  paces: PaceOption[];
  travelCompanies: TravelCompanyOption[];
  /** Labels shown in order while a stay is being composed. */
  synthesisSteps: string[];
  demoPrompt: string;
}

/** The guest's saved (preselected) preferences. */
export interface GuestProfile {
  /** The profile as the API returned it; the update is sent back in this shape. */
  source: ProfileDto;
  moodIds: number[];
  paceId: number;
  travelCompanyId: number;
  openToGuestCircles: boolean;
  intention: string;
  refinedPreferences: RefinedPreference[];
}

/** Payload the welcome screen submits. */
export interface GuestPreferencesInput {
  moodIds: number[];
  paceId: number;
  travelCompanyId: number;
  openToGuestCircles: boolean;
  intention: string;
}

// REST DTOs ------------------------------------------------------------------

interface OptionDto {
  id: number;
  name: string;
  isActive: boolean;
}

/** GET /api/profile/options */
export interface ProfileOptionsDto {
  atmosphereAndMood: OptionDto[];
  itineraryCadence: (OptionDto & { description: string })[];
  travelCompany: (OptionDto & { icon: string })[];
}

/** GET /api/profile — also the request body for PUT /api/profile. */
export interface ProfileDto {
  id: number;
  guestId: number;
  preferences: {
    budgetTier: string;
    defaultPrompt: string;
    travelCompanyId: number;
    atmosphereMoodIds: number[];
    doNotDisturbBefore: string;
    itineraryCadenceId: number;
    openToGuestCircles: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Guest circles (events swipe)
// ---------------------------------------------------------------------------

export type SwipeAction = 'join' | 'pass';

export interface MatchBreakdownRow {
  key: string;
  label: string;
  percent: number;
  detail: string;
}

/** One invitation card, ready for the events screen. */
export interface CircleCard {
  itineraryId: number;
  imageUrl: string;
  whenLabel: string;
  spotsLabel: string;
  note?: string;
  location: string;
  title: string;
  inviteMessage: string;
  host: { name: string; initials: string; imageUrl?: string; suiteLabel: string };
  tags: string[];
  matchPercent: number;
  matchBreakdown: MatchBreakdownRow[];
  matchReasons: string[];
}

/** GET /api/circles/feed and GET /api/circles/joined items. */
export interface CircleCardDto {
  itineraryId: number;
  matchPercent: number;
  matchBreakdown?: (MatchBreakdownRow & { weight: number })[];
  matchReasons?: string[];
  host: {
    guestId: number;
    name: string;
    profileImage?: string | null;
    suiteLabel: string;
    openToGuestCircles: boolean;
  };
  title: string;
  tagline: string;
  /** ISO date, e.g. "2026-10-05". */
  itineraryDate: string;
  posterUrl: string;
  videoUrl?: string;
  inviteMessage: string;
  spotsTotal: number;
  spotsRemaining: number;
  highlight?: {
    time?: string;
    title?: string;
    note?: string;
    location?: string;
    imageUrl?: string;
    description?: string;
    status?: string;
    statusLabel?: string;
    durationLabel?: string;
    tags?: string[];
  };
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Single day itinerary
// ---------------------------------------------------------------------------

export interface ItineraryFooter {
  label?: string;
  actionLabel?: string;
}

export interface ItineraryItem {
  id: string;
  time: string;
  meta: string;
  confirmed: boolean;
  statusLabel: string;
  title: string;
  description: string;
  reason?: string;
  image?: { url: string; alt: string; caption?: string };
  footer?: ItineraryFooter;
}

export interface ItineraryDay {
  badge: string;
  coverImageUrl: string;
  videoUrl?: string;
  coverEyebrow: string;
  coverTitle: string;
  heading: string;
  quote: string;
  items: ItineraryItem[];
}

/**
 * POST /api/plan/createItenaryFromLlm — the guest's selections for the LLM.
 * The backend currently reads guestId, defaultPrompt, travelCompanyId and
 * atmosphereMoodIds; the rest are sent so it can start using them.
 */
export interface CreateItineraryRequest {
  guestId: number;
  defaultPrompt: string;
  atmosphereMoodIds: number[];
  itineraryCadenceId: number;
  travelCompanyId: number;
  openToGuestCircles: boolean;
  budgetTier: string;
  doNotDisturbBefore: string;
}

/** GET /api/Itinerary (also returned by createItenaryFromLlm) */
export interface ItineraryDto {
  id: number;
  guestId: number;
  title: string;
  tagline: string;
  suiteLabel: string;
  /** ISO date, e.g. "2026-10-02". */
  itineraryDate: string;
  posterUrl: string;
  videoUrl?: string;
  items: {
    time: string;
    title: string;
    status: string;
    statusLabel: string;
    location: string;
    description: string;
    note?: string;
    durationLabel?: string;
    imageUrl?: string;
    imageCaption?: string;
    footerText?: string;
    actionLabel?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}
