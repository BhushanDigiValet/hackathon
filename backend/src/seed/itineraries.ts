import { Repository } from 'typeorm';
import { CuratedItineraryItem, Guest, GuestItinerary } from '../entities';

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

const IMAGES = {
  resortNight: img('1566073771259-6a8506099945'),
  resortPool: img('1571896349842-33c89424de2d'),
  resortVilla: img('1520250497591-112f2f40a3f4'),
  hotelExterior: img('1542314831-068cd1dbfeeb'),
  hotelLobby: img('1551882547-ff40c63fe5fa'),
  suite: img('1582719508461-905c673771fd'),
  fineDining: img('1414235077428-338989a2e8c0'),
  restaurant: img('1517248135467-4c7edcad34c4'),
  spa: img('1544161515-4ab6ce6db874'),
  spaStones: img('1540555700478-4be289fbecef'),
  jazz: img('1415201364774-f6f0bb35f28f'),
  concert: img('1511192336575-5a79af67a629'),
  beachSunset: img('1507525428034-b723cf961d3e'),
  cocktails: img('1470337458703-46ad1756a187'),
};

// Short public sample clips used as placeholder cinematic previews
const VIDEOS = {
  jellyfish:
    'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
  sintel:
    'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  bunny:
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
};

type ItinerarySeed = Omit<
  GuestItinerary,
  'id' | 'guestId' | 'createdAt' | 'updatedAt'
> & { items: CuratedItineraryItem[] };

const ITINERARIES: ItinerarySeed[] = [
  {
    title: 'Your Curated Journey',
    tagline:
      'Arrive slowly, breathe out. Every hour prepared for your arrival.',
    suiteLabel: 'Suite 1204',
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
];

/** Seeds one itinerary each for the first few guests. */
export async function seedItineraries(
  itineraryRepo: Repository<GuestItinerary>,
  guests: Guest[],
) {
  const itineraries = ITINERARIES.map((data, index) =>
    itineraryRepo.create({ ...data, guestId: guests[index].id }),
  );
  await itineraryRepo.save(itineraries);
}
