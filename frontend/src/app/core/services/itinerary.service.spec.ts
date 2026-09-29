import { ItineraryDto } from '../models/stay.models';
import { toItineraryDay } from './itinerary.service';

const DTO: ItineraryDto = {
  id: 1,
  guestId: 1,
  title: 'Your Curated Journey',
  tagline: 'Arrive slowly, breathe out.',
  suiteLabel: 'Suite 1204',
  itineraryDate: '2026-10-02',
  posterUrl: 'https://example.com/poster.jpg',
  videoUrl: 'https://example.com/video.mp4',
  items: [
    {
      time: '18:00',
      title: 'Sunset Terrace',
      status: 'confirmed',
      statusLabel: 'Confirmed',
      location: 'Lake of Dreams Terrace',
      durationLabel: '90 min',
      description: 'Daybed with Krug.',
      note: 'Because you asked for a sunset.',
      imageUrl: 'https://example.com/terrace.jpg',
      imageCaption: 'Table 4',
      footerText: 'Dress Code: Resort Chic',
      actionLabel: 'View Menu',
    },
    {
      time: '23:00',
      title: 'Jazz Salon',
      status: 'open',
      statusLabel: 'Open Lounge',
      location: 'The Velvet Nook',
      description: 'Live vinyl.',
    },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('toItineraryDay', () => {
  it('maps the API response onto the screen model', () => {
    const day = toItineraryDay(DTO, new Date(2026, 9, 2));
    expect(day.badge).toBe("Today's Flow · Suite 1204");
    expect(day.heading).toBe("Today's Curated Journey");
    expect(day.quote).toBe('“Arrive slowly, breathe out.”');
    expect(day.coverImageUrl).toBe(DTO.posterUrl);

    const [sunset, jazz] = day.items;
    expect(sunset.meta).toBe('Lake of Dreams Terrace · 90 min');
    expect(sunset.confirmed).toBe(true);
    expect(sunset.image).toEqual({ url: DTO.items[0].imageUrl, alt: 'Sunset Terrace', caption: 'Table 4' });
    expect(sunset.footer).toEqual({ label: 'Dress Code: Resort Chic', actionLabel: 'View Menu' });

    expect(jazz.meta).toBe('The Velvet Nook');
    expect(jazz.confirmed).toBe(false);
    expect(jazz.image).toBeUndefined();
    expect(jazz.footer).toBeUndefined();
    expect(jazz.reason).toBeUndefined();
  });

  it('labels other dates relative to today', () => {
    expect(toItineraryDay(DTO, new Date(2026, 9, 1)).heading).toBe("Tomorrow's Curated Journey");
    const later = toItineraryDay(DTO, new Date(2026, 8, 29));
    expect(later.badge).toBe('Fri 2 Oct · Suite 1204');
    expect(later.heading).toBe('Curated Journey · Friday 2 October');
  });
});
