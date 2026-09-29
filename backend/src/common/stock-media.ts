const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

/** Verified Unsplash photos used for itinerary posters and card images. */
export const IMAGES = {
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

/** Short public sample clips used as placeholder cinematic previews. */
export const VIDEOS = {
  jellyfish:
    'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
  sintel:
    'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  bunny:
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
};

/** Picks a stock image for a catalogue item from its categoryGroup and tags. */
export function imageForCatalogueItem(details: any): string {
  const tags: string[] = details?.tags || [];
  if (tags.includes('pool')) return IMAGES.resortPool;
  if (tags.includes('sunset')) return IMAGES.beachSunset;
  switch (details?.categoryGroup) {
    case 'spa':
    case 'fitness':
      return IMAGES.spaStones;
    case 'bar':
      return IMAGES.cocktails;
    case 'nightlife':
    case 'show':
      return tags.includes('live_music') ? IMAGES.jazz : IMAGES.concert;
    case 'in_room':
      return IMAGES.suite;
    case 'experience':
      return IMAGES.beachSunset;
    case 'dining':
      return IMAGES.fineDining;
    default:
      return IMAGES.hotelLobby;
  }
}
