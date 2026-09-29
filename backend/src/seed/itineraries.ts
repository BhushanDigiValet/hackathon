import { Repository } from 'typeorm';
import {
  CuratedItineraryItem,
  Guest,
  GuestItinerary,
  StayProfile,
} from '../entities';
import { IMAGES, VIDEOS } from '../common/stock-media';

const BUDGET_TIERS = {
  2: 'Tier 2 - Elevated',
  3: 'Tier 3 - Luxury',
  4: 'Tier 4 - Unrestricted',
} as const;

/**
 * Fixed stay-profile preferences for the host of each seeded itinerary, so
 * Guest Circles matching is deterministic. Ids refer to the master tables:
 * moods 1 Relaxed, 2 Indulgent, 3 Adventurous, 4 Romantic, 5 Social,
 * 6 Recharge; pace 1 Slow, 2 Balanced, 3 Packed; company 1 Just me,
 * 2 Partner, 3 Friends, 4 Family.
 */
const hostPrefs = (
  atmosphereMoodIds: number[],
  itineraryCadenceId: number,
  travelCompanyId: number,
  budgetTier: keyof typeof BUDGET_TIERS,
  openToGuestCircles = true,
) => ({
  atmosphereMoodIds,
  itineraryCadenceId,
  travelCompanyId,
  budgetTier: BUDGET_TIERS[budgetTier],
  openToGuestCircles,
});

type ItinerarySeed = Omit<
  GuestItinerary,
  'id' | 'guestId' | 'createdAt' | 'updatedAt'
> & {
  items: CuratedItineraryItem[];
  hostPreferences: ReturnType<typeof hostPrefs>;
};

const ITINERARIES: ItinerarySeed[] = [
  {
    title: 'Your Curated Journey',
    tagline:
      'Arrive slowly, breathe out. Every hour prepared for your arrival.',
    suiteLabel: 'Suite 1204',
    spotsTotal: 4,
    inviteMessage:
      'Staying on for the jazz salon after dinner — join us for a nightcap by the fire.',
    hostPreferences: hostPrefs([2, 5], 2, 2, 3),
    itineraryDate: '2026-10-02',
    posterUrl: IMAGES.resortNight,
    videoUrl: VIDEOS.jellyfish,
    items: [
      {
        time: '15:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Sanctuary Arrival · Private Wing',
        title: 'Arrival & In-Suite Welcome Prelude',
        description:
          'Private botanical infusion service, luggage unburdening, and personalized digital keycard synchronization in Suite 1204.',
        note: 'Curated to transition seamlessly from your transit without lobby reception queues.',
        footerText: 'Suite ready at 14:30',
        actionLabel: 'Host Details',
      },
      {
        time: '18:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Lake of Dreams Terrace',
        durationLabel: '90 min',
        title: 'Sunset Terrace & Vintage Reserve',
        description:
          'Private waterfront daybed reserved with Krug Grande Cuvée service and golden-hour acoustic soundscape prelude.',
        imageUrl: IMAGES.resortPool,
        imageCaption: 'Table 4 · Lakeside View',
        note: 'Because you asked for a beautiful sunset and something social tonight.',
        footerText: 'Dress Code: Resort Chic',
        actionLabel: 'View Menu',
      },
      {
        time: '20:30',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Tableau · Salon Privé',
        durationLabel: '2 hours',
        title: 'Tableau Fine Dining — Seasonal Botanical Tasting',
        description:
          'Six-course botanical tasting with rare vintage pairings. Sommelier Antoine has prepared cellar selections.',
        note: 'Because you wanted indulgent dining without the burden of planning.',
        footerText: 'Dietary: Shellfish noted',
        actionLabel: 'Reserve details',
      },
      {
        time: '23:00',
        status: 'open',
        statusLabel: 'Open Lounge',
        location: 'The Velvet Nook · Open Seating',
        title: 'Intimate Jazz Salon & Nightcap',
        description:
          'Live vinyl curation and acoustic harp performance. Fireplaces lit until 02:00.',
        note: 'Signature cocktail "Midnight Bourbon Bloom" held for your arrival.',
      },
    ],
  },
  {
    title: 'A Day of Deep Restoration',
    tagline: 'No alarms, no rush. Let the day unfold at your pace.',
    suiteLabel: 'Villa 7',
    spotsTotal: 2,
    inviteMessage:
      'A quiet day of restoring ourselves. Happy to share the chef’s counter with one more calm couple.',
    hostPreferences: hostPrefs([1, 6], 1, 2, 3),
    itineraryDate: '2026-10-02',
    posterUrl: IMAGES.spa,
    videoUrl: VIDEOS.sintel,
    items: [
      {
        time: '10:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Villa 7 · Private Terrace',
        durationLabel: '60 min',
        title: 'Slow Breakfast on the Terrace',
        description:
          'Seasonal fruit, house-cultured yoghurt and single-origin pour-over, served whenever you open the terrace doors.',
        note: 'Because you mentioned wanting to sleep in every morning.',
        footerText: 'Served on request',
        actionLabel: 'Adjust menu',
      },
      {
        time: '13:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'The Spa · Suite of Stones',
        durationLabel: '120 min',
        title: 'Hot Stone Ritual for Two',
        description:
          'Basalt stone massage, botanical steam and a private relaxation lounge with herbal tonics.',
        imageUrl: IMAGES.spaStones,
        imageCaption: 'Couples Suite · Garden View',
        note: 'Because this trip is about recharging together.',
        footerText: 'Arrive 15 min early',
        actionLabel: 'Treatment details',
      },
      {
        time: '19:30',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Ember & Oak · Chef’s Counter',
        durationLabel: '2 hours',
        title: 'Chef’s Counter Tasting',
        description:
          'An eight-course wood-fire menu cooked in front of you, paired with small-producer wines.',
        imageUrl: IMAGES.fineDining,
        imageCaption: 'Seats 3 & 4 · Counter',
        note: 'Because you wanted fine dining that still feels intimate.',
        footerText: 'Dress Code: Smart Casual',
        actionLabel: 'View Menu',
      },
    ],
  },
  {
    title: 'The Adventurer’s Weekend',
    tagline: 'Big days, late nights, and not a minute wasted.',
    suiteLabel: 'Suite 2210',
    spotsTotal: 6,
    inviteMessage:
      'Rooftop after the show, the more the merrier. Bring your best story from the day.',
    hostPreferences: hostPrefs([3, 5], 3, 3, 2),
    itineraryDate: '2026-10-03',
    posterUrl: IMAGES.beachSunset,
    videoUrl: VIDEOS.bunny,
    items: [
      {
        time: '08:30',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Marina Dock · Pier 2',
        durationLabel: '3 hours',
        title: 'Private Coastal Sail',
        description:
          'Skippered catamaran along the coast with a swim stop at a hidden cove and a chilled picnic on board.',
        imageUrl: IMAGES.beachSunset,
        imageCaption: 'Catamaran Aurelia',
        note: 'Because you wanted to explore beyond the resort.',
        footerText: 'Bring swimwear',
        actionLabel: 'Meeting point',
      },
      {
        time: '14:00',
        status: 'pending',
        statusLabel: 'Pending',
        location: 'Street Market Tour',
        durationLabel: '2 hours',
        title: 'Hidden Flavours Food Walk',
        description:
          'A local guide leads you through six tasting stops across the old town market.',
        note: 'Because you asked for unique dining experiences.',
        footerText: 'Comfortable shoes recommended',
        actionLabel: 'Tour details',
      },
      {
        time: '21:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Grand Theatre · Box 3',
        durationLabel: '2 hours',
        title: 'Late-Night Live Show',
        description:
          'Acrobatics and live orchestra in a private box, with champagne at the interval.',
        imageUrl: IMAGES.concert,
        imageCaption: 'Private Box 3',
        note: 'Because you wanted to catch a late-night show.',
        footerText: 'Doors open 20:30',
        actionLabel: 'Tickets',
      },
      {
        time: '23:30',
        status: 'open',
        statusLabel: 'Open Lounge',
        location: 'Skybar · Rooftop',
        title: 'Rooftop Nightcap',
        description:
          'City lights, a DJ set and a cocktail list built around local botanicals.',
        imageUrl: IMAGES.cocktails,
        note: 'A table is held for you until 01:00.',
      },
    ],
  },
  {
    title: 'A Romantic Escape',
    tagline: 'Just the two of you, and everything taken care of.',
    suiteLabel: 'Penthouse 3',
    spotsTotal: 2,
    inviteMessage:
      'Celebrating our anniversary at the beach cabana. One more couple welcome for a sunset toast.',
    hostPreferences: hostPrefs([4, 2], 1, 2, 4),
    itineraryDate: '2026-10-04',
    posterUrl: IMAGES.resortVilla,
    videoUrl: VIDEOS.jellyfish,
    items: [
      {
        time: '16:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Penthouse 3 · Arrival',
        title: 'Rose Petal Turndown & Champagne',
        description:
          'Your penthouse prepared with fresh florals, a drawn bath and a chilled bottle of rosé champagne.',
        imageUrl: IMAGES.suite,
        imageCaption: 'Penthouse 3 · Ocean View',
        note: 'Because this is a romantic getaway for two.',
        footerText: 'Suite ready at 15:30',
        actionLabel: 'Host Details',
      },
      {
        time: '18:45',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Private Beach Cabana',
        durationLabel: '60 min',
        title: 'Golden Hour on the Sand',
        description:
          'A lantern-lit cabana with canapés and a live acoustic guitarist.',
        imageUrl: IMAGES.beachSunset,
        imageCaption: 'Cabana 1 · Shoreline',
        note: 'Because you both love a slow sunset.',
        footerText: 'Barefoot welcome',
        actionLabel: 'Directions',
      },
      {
        time: '20:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Lumière · Window Table',
        durationLabel: '2 hours',
        title: 'Candlelit Dinner at Lumière',
        description:
          'French coastal cuisine with a sommelier-led pairing, finished with dessert on the balcony.',
        imageUrl: IMAGES.restaurant,
        note: 'Because you wanted fine dining without planning anything yourself.',
        footerText: 'Dress Code: Elegant',
        actionLabel: 'View Menu',
      },
    ],
  },
  {
    title: 'Family Days by the Water',
    tagline: 'Something for everyone, with room to breathe in between.',
    suiteLabel: 'Family Suite 804',
    spotsTotal: 6,
    inviteMessage:
      'Our kids would love pool buddies! Big cabana, plenty of snacks, parents very welcome.',
    hostPreferences: hostPrefs([1, 5], 2, 4, 2),
    itineraryDate: '2026-10-05',
    posterUrl: IMAGES.resortPool,
    videoUrl: VIDEOS.bunny,
    items: [
      {
        time: '09:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Garden Café',
        durationLabel: '60 min',
        title: 'Family Breakfast Buffet',
        description:
          'Pancake station, fresh juices and a kids’ corner with colouring kits.',
        note: 'Because you’re travelling with family.',
        footerText: 'High chairs available',
        actionLabel: 'View Menu',
      },
      {
        time: '11:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Lagoon Pool · Cabana 12',
        durationLabel: 'Half day',
        title: 'Reserved Poolside Cabana',
        description:
          'Shaded cabana with towels, sunscreen, snacks on call and a lifeguard-supervised kids’ pool.',
        imageUrl: IMAGES.resortPool,
        imageCaption: 'Cabana 12 · Lagoon Pool',
        note: 'Because the kids wanted pool time and you wanted shade.',
        footerText: 'Kids’ club drop-in available',
        actionLabel: 'Cabana details',
      },
      {
        time: '18:30',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Harbour Grill · Terrace',
        durationLabel: '90 min',
        title: 'Early Family Dinner',
        description:
          'Grilled seafood and a kids’ menu on the terrace, timed before bedtime.',
        imageUrl: IMAGES.restaurant,
        note: 'Because an early dinner keeps everyone happy.',
        footerText: 'Dietary: Nut-free noted',
        actionLabel: 'Reserve details',
      },
    ],
  },
  {
    title: 'Solo Reset',
    tagline: 'A day that asks nothing of you.',
    suiteLabel: 'Suite 1510',
    spotsTotal: 1,
    inviteMessage: 'Mostly keeping to myself this trip.',
    // Opted out of guest circles: never appears in anyone's feed
    hostPreferences: hostPrefs([1, 6], 1, 1, 3, false),
    itineraryDate: '2026-10-06',
    posterUrl: IMAGES.hotelExterior,
    videoUrl: VIDEOS.sintel,
    items: [
      {
        time: '07:30',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Sky Deck · Studio',
        durationLabel: '45 min',
        title: 'Sunrise Yoga',
        description:
          'A gentle flow session overlooking the bay, mats and tea provided.',
        note: 'Because you wanted to start the day calmly.',
        footerText: 'All levels welcome',
        actionLabel: 'Class details',
      },
      {
        time: '12:30',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'The Library Bar',
        durationLabel: '60 min',
        title: 'Quiet Lunch & Reading Nook',
        description:
          'A reserved armchair by the window with a light lunch and a curated shelf of new releases.',
        imageUrl: IMAGES.hotelLobby,
        imageCaption: 'Window Nook · Library Bar',
        note: 'Because you asked for time to yourself.',
        footerText: 'Phone-free zone',
        actionLabel: 'View Menu',
      },
      {
        time: '22:00',
        status: 'open',
        statusLabel: 'Open Lounge',
        location: 'The Velvet Nook · Bar Seating',
        title: 'Jazz & a Single Malt',
        description:
          'A live trio playing standards, with a rare whisky flight at the bar.',
        imageUrl: IMAGES.jazz,
        note: 'A bar seat is held for you until midnight.',
      },
    ],
  },
  {
    title: 'An Evening Among Friends',
    tagline: 'Slow jazz, rare vintages and conversation that runs late.',
    suiteLabel: 'Suite 1408',
    itineraryDate: '2026-10-02',
    posterUrl: IMAGES.resortNight,
    videoUrl: VIDEOS.jellyfish,
    spotsTotal: 2,
    inviteMessage:
      'Opening a magnum of Dom Pérignon 2012 by the fountain fire bowl. Seeking two fellow art or wine lovers for slow jazz and midnight conversation.',
    hostPreferences: hostPrefs([1, 2], 1, 2, 3),
    items: [
      {
        time: '19:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'Tableau · Salon Privé',
        durationLabel: '2 hours',
        title: 'Seasonal Botanical Tasting',
        description: 'Six courses with rare vintage pairings.',
        imageUrl: IMAGES.fineDining,
      },
      {
        time: '21:00',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'North Veranda Pavilion · Private Fire Pit #3',
        title: 'Twilight Champagne & Vinyl on the Fountain Terrace',
        description:
          'A private fire pit on the fountain terrace with a vinyl selection and a magnum on ice.',
        imageUrl: IMAGES.resortNight,
        note: 'Verified Resident Invitation',
        tags: ['Acoustic Jazz', 'Grand Cru Tasting', 'Unrushed Convo'],
      },
    ],
  },
  {
    title: 'Sunrise Wellness Circle',
    tagline: 'Early light, slow breath, strong coffee.',
    suiteLabel: 'Suite 602',
    itineraryDate: '2026-10-03',
    posterUrl: IMAGES.spa,
    videoUrl: VIDEOS.sintel,
    spotsTotal: 5,
    inviteMessage:
      'Leading a small sunrise breathwork session before the spa opens. Beginners very welcome.',
    hostPreferences: hostPrefs([1, 6], 1, 1, 2),
    items: [
      {
        time: '06:45',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'Sky Deck · Studio',
        durationLabel: '45 min',
        title: 'Sunrise Breathwork & Stretch',
        description:
          'Guided breathwork followed by a gentle stretch as the sun comes up.',
        imageUrl: IMAGES.spaStones,
        tags: ['Breathwork', 'Sunrise', 'All Levels'],
      },
      {
        time: '10:00',
        status: 'confirmed',
        statusLabel: 'Confirmed',
        location: 'The Spa · Thermal Suite',
        durationLabel: '90 min',
        title: 'Thermal Circuit',
        description: 'Steam, sauna and cold plunge circuit.',
      },
    ],
  },
  {
    title: 'Rooftop Mixology Night',
    tagline: 'Shake, stir, repeat — then dance.',
    suiteLabel: 'Suite 3001',
    itineraryDate: '2026-10-03',
    posterUrl: IMAGES.cocktails,
    videoUrl: VIDEOS.bunny,
    spotsTotal: 6,
    inviteMessage:
      'Booked the rooftop mixology class and have extra seats. Come learn three cocktails, then stay for the DJ.',
    hostPreferences: hostPrefs([5, 3], 3, 3, 3),
    items: [
      {
        time: '20:00',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'Skybar · Rooftop',
        durationLabel: '90 min',
        title: 'Mixology Masterclass',
        description:
          'Head bartender walks you through three signature cocktails.',
        imageUrl: IMAGES.cocktails,
        tags: ['Cocktails', 'DJ Set', 'Rooftop'],
      },
    ],
  },
  {
    title: 'Cellar Door Evening',
    tagline: 'Old vintages, new friends.',
    suiteLabel: 'Villa 12',
    itineraryDate: '2026-10-04',
    posterUrl: IMAGES.restaurant,
    videoUrl: VIDEOS.sintel,
    spotsTotal: 3,
    inviteMessage:
      'Private cellar tasting with the head sommelier — six Burgundies side by side. Looking for fellow wine lovers.',
    hostPreferences: hostPrefs([2, 4], 2, 2, 4),
    items: [
      {
        time: '18:30',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'The Cellar · Private Vault',
        durationLabel: '2 hours',
        title: 'Burgundy Vertical Tasting',
        description:
          'Six Burgundies from one estate, paired with aged cheeses.',
        imageUrl: IMAGES.restaurant,
        tags: ['Grand Cru Tasting', 'Sommelier Led', 'Intimate'],
      },
    ],
  },
  {
    title: 'Lagoon Afternoon',
    tagline: 'Sun, splash and ice cream.',
    suiteLabel: 'Family Suite 812',
    itineraryDate: '2026-10-05',
    posterUrl: IMAGES.resortPool,
    videoUrl: VIDEOS.bunny,
    spotsTotal: 8,
    inviteMessage:
      'Two cabanas booked next to the kids’ pool. Other families welcome to join — we’ll bring the ice cream.',
    hostPreferences: hostPrefs([1, 5], 2, 4, 2),
    items: [
      {
        time: '13:00',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'Lagoon Pool · Cabanas 14-15',
        durationLabel: 'Afternoon',
        title: 'Family Pool Party',
        description:
          'Pool games, a lifeguard on duty and an ice-cream cart at 15:00.',
        imageUrl: IMAGES.resortPool,
        tags: ['Kids Welcome', 'Pool Games', 'Ice Cream'],
      },
    ],
  },
  {
    title: 'Desert Stargazing',
    tagline: 'Leave the lights behind.',
    suiteLabel: 'Suite 1702',
    itineraryDate: '2026-10-05',
    posterUrl: IMAGES.beachSunset,
    videoUrl: VIDEOS.jellyfish,
    spotsTotal: 4,
    inviteMessage:
      'Private 4x4 out to the dunes with an astronomer. Two seats left for another adventurous couple.',
    hostPreferences: hostPrefs([3, 4], 2, 2, 3),
    items: [
      {
        time: '21:30',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'Desert Camp · Dune Ridge',
        durationLabel: '3 hours',
        title: 'Stargazing with an Astronomer',
        description:
          'Telescopes, a fire pit and hot chocolate under a dark-sky reserve.',
        imageUrl: IMAGES.beachSunset,
        tags: ['Stargazing', 'Adventure', 'Fire Pit'],
      },
    ],
  },
  {
    title: 'Chef’s Table Social',
    tagline: 'Ten seats, one long table, no strangers.',
    suiteLabel: 'Penthouse 1',
    itineraryDate: '2026-10-06',
    posterUrl: IMAGES.fineDining,
    videoUrl: VIDEOS.sintel,
    spotsTotal: 4,
    inviteMessage:
      'Hosting a long-table dinner with the executive chef. Great food, better company — four seats open.',
    hostPreferences: hostPrefs([2, 5], 2, 3, 4),
    items: [
      {
        time: '20:00',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'Ember & Oak · Chef’s Table',
        durationLabel: '3 hours',
        title: 'Long-Table Tasting Dinner',
        description:
          'A twelve-course menu served family style by the executive chef.',
        imageUrl: IMAGES.fineDining,
        tags: ['Chef’s Table', 'Social Dining', 'Wine Pairing'],
      },
    ],
  },
  {
    title: 'Late Jazz & Whisky',
    tagline: 'Low light, lower voices.',
    suiteLabel: 'Suite 1101',
    itineraryDate: '2026-10-06',
    posterUrl: IMAGES.jazz,
    videoUrl: VIDEOS.jellyfish,
    spotsTotal: 3,
    inviteMessage:
      'Reserved the corner booth for the late trio. Looking for a couple of whisky people to share a rare flight.',
    hostPreferences: hostPrefs([1, 2, 5], 1, 1, 3),
    items: [
      {
        time: '22:30',
        status: 'open',
        statusLabel: 'Open Invitation',
        location: 'The Velvet Nook · Corner Booth',
        durationLabel: '2 hours',
        title: 'Rare Whisky Flight & Jazz Trio',
        description:
          'Four rare single malts poured tableside while the late trio plays.',
        imageUrl: IMAGES.jazz,
        tags: ['Acoustic Jazz', 'Whisky Flight', 'Unrushed Convo'],
      },
    ],
  },
];

/**
 * Seeds one itinerary each for the first guests (1-14) and gives each host
 * fixed stay-profile preferences so Guest Circles matching is deterministic.
 */
export async function seedItineraries(
  itineraryRepo: Repository<GuestItinerary>,
  profileRepo: Repository<StayProfile>,
  guests: Guest[],
) {
  for (const [index, { hostPreferences, ...data }] of ITINERARIES.entries()) {
    const guestId = guests[index].id;
    await itineraryRepo.save(itineraryRepo.create({ ...data, guestId }));

    const profile = await profileRepo.findOne({ where: { guestId } });
    if (profile) {
      profile.preferences = { ...profile.preferences, ...hostPreferences };
      await profileRepo.save(profile);
    }
  }
}
