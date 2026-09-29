import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GuestSessionService } from '../auth/guest-session.service';
import { Nudge } from '../models/stay.models';
import { NUDGE_POLL_MS, NudgesService } from './nudges.service';

const nudge = (id: number, isRead = false): Nudge => ({
  id,
  recipientGuestId: 1,
  senderGuestId: 9,
  itineraryId: 1,
  type: 'circle_join',
  message: `Nudge ${id}`,
  isRead,
  createdAt: '2026-09-29T16:02:11.000Z',
  sender: { guestId: 9, name: 'Guest 9', profileImage: null },
});

const listUrl = (r: { url: string; method: string }) => r.url === '/api/nudges' && r.method === 'GET';

describe('NudgesService', () => {
  let service: NudgesService;
  let session: GuestSessionService;
  let controller: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(GuestSessionService);
    session.session.set({ guestId: 1, name: 'Guest 1', email: 'guest1@example.com' });
    service = TestBed.inject(NudgesService);
    controller = TestBed.inject(HttpTestingController);
    TestBed.tick(); // run the guest effect
  });

  afterEach(() => {
    service.stop();
    controller.verify();
    vi.useRealTimers();
  });

  it('loads the inbox, then polls only for newer nudges', () => {
    service.start();
    const first = controller.expectOne(listUrl);
    expect(first.request.params.has('afterId')).toBe(false);
    first.flush({ nudges: [nudge(2), nudge(1)], unreadCount: 2, latestId: 2 });
    expect(service.nudges().map((n) => n.id)).toEqual([2, 1]);
    expect(service.unreadCount()).toBe(2);

    vi.advanceTimersByTime(NUDGE_POLL_MS);
    const poll = controller.expectOne(listUrl);
    expect(poll.request.params.get('afterId')).toBe('2');
    poll.flush({ nudges: [nudge(3)], unreadCount: 3, latestId: 3 });
    expect(service.nudges().map((n) => n.id)).toEqual([3, 2, 1]);
    expect(service.unreadCount()).toBe(3);

    vi.advanceTimersByTime(NUDGE_POLL_MS);
    controller.expectOne(listUrl).flush({ nudges: [], unreadCount: 3, latestId: 3 });
    expect(service.nudges()).toHaveLength(3);
  });

  it('marks one nudge read, and then all of them', () => {
    service.start();
    controller.expectOne(listUrl).flush({ nudges: [nudge(2), nudge(1)], unreadCount: 2, latestId: 2 });

    service.markRead(service.nudges()[1]);
    const one = controller.expectOne('/api/nudges/1/read');
    expect(one.request.method).toBe('PATCH');
    one.flush({ ...nudge(1), isRead: true });
    expect(service.unreadCount()).toBe(1);
    expect(service.nudges()[1].isRead).toBe(true);

    service.markAllRead();
    const all = controller.expectOne('/api/nudges/read-all');
    expect(all.request.method).toBe('PATCH');
    all.flush({ updated: 1 });
    expect(service.unreadCount()).toBe(0);
    expect(service.nudges().every((n) => n.isRead)).toBe(true);
  });

  it('starts a fresh inbox when the guest changes', () => {
    service.start();
    controller.expectOne(listUrl).flush({ nudges: [nudge(2)], unreadCount: 1, latestId: 2 });

    session.session.set({ guestId: 3, name: 'Guest 3', email: 'guest3@example.com' });
    TestBed.tick();
    expect(service.nudges()).toEqual([]);
    const fresh = controller.expectOne(listUrl);
    expect(fresh.request.params.has('afterId')).toBe(false); // latestId reset to 0
    fresh.flush({ nudges: [], unreadCount: 0, latestId: 0 });
  });
});
