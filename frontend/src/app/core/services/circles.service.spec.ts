import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CircleCardDto } from '../models/stay.models';
import { CirclesService, toCircleCard } from './circles.service';

export function circleDto(overrides: Partial<CircleCardDto> = {}): CircleCardDto {
  return {
    itineraryId: 7,
    matchPercent: 69.6,
    matchBreakdown: [
      { key: 'pace', label: 'Itinerary Pace', weight: 20, percent: 50, detail: 'Similar pace: Slow' },
    ],
    matchReasons: ['Same pace: Slow'],
    host: {
      guestId: 14,
      name: 'Julian & Claire',
      profileImage: null,
      suiteLabel: 'Suite 1408',
      openToGuestCircles: true,
    },
    title: 'Late Jazz & Whisky',
    tagline: 'Low light.',
    itineraryDate: '2026-10-02',
    posterUrl: 'https://example.com/poster.jpg',
    inviteMessage: 'Opening a magnum by the fire.',
    spotsTotal: 4,
    spotsRemaining: 2,
    highlight: {
      time: '21:00',
      title: 'Twilight Champagne',
      note: 'Verified Resident Invitation',
      location: 'North Veranda',
      imageUrl: 'https://example.com/highlight.jpg',
    },
    tags: ['Acoustic Jazz'],
    ...overrides,
  };
}

describe('toCircleCard', () => {
  const today = new Date(2026, 9, 2);

  it('maps highlight fields onto the card', () => {
    const card = toCircleCard(circleDto(), today);
    expect(card).toMatchObject({
      itineraryId: 7,
      imageUrl: 'https://example.com/highlight.jpg',
      whenLabel: 'Tonight · 21:00',
      spotsLabel: '2 spots remaining',
      note: 'Verified Resident Invitation',
      location: 'North Veranda',
      title: 'Twilight Champagne',
      tags: ['Acoustic Jazz'],
      matchPercent: 70,
      matchReasons: ['Same pace: Slow'],
    });
    expect(card.host).toEqual({ name: 'Julian & Claire', initials: 'JC', imageUrl: undefined, suiteLabel: 'Suite 1408' });
    expect(card.matchBreakdown).toEqual([
      { key: 'pace', label: 'Itinerary Pace', percent: 50, detail: 'Similar pace: Slow' },
    ]);
  });

  it('falls back to the poster and itinerary title without a highlight', () => {
    const card = toCircleCard(circleDto({ highlight: undefined, spotsRemaining: 1 }), today);
    expect(card.imageUrl).toBe('https://example.com/poster.jpg');
    expect(card.title).toBe('Late Jazz & Whisky');
    expect(card.spotsLabel).toBe('1 spot remaining');
    expect(card.note).toBeUndefined();
  });

  it('adds the date when the gathering is not today', () => {
    expect(toCircleCard(circleDto({ itineraryDate: '2026-10-03' }), today).whenLabel).toBe('Tomorrow · 21:00');
    expect(toCircleCard(circleDto({ itineraryDate: '2026-10-05' }), today).whenLabel).toBe('Mon 5 Oct · 21:00');
    const afternoon = circleDto({ highlight: { ...circleDto().highlight, time: '13:00' } });
    expect(toCircleCard(afternoon, today).whenLabel).toBe('Today · 13:00');
  });
});

describe('CirclesService', () => {
  let service: CirclesService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CirclesService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('loads the feed with a limit', () => {
    service.getFeed(10).subscribe();
    const req = controller.expectOne((r) => r.url === '/api/circles/feed');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush([]);
  });

  it('posts swipes with the itinerary id and action', () => {
    service.swipe(7, 'join').subscribe();
    const req = controller.expectOne('/api/circles/swipe');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ itineraryId: 7, action: 'join' });
    req.flush({});
  });

  it('resets swipes with DELETE', () => {
    service.resetSwipes().subscribe();
    expect(controller.expectOne('/api/circles/swipes').request.method).toBe('DELETE');
  });
});
