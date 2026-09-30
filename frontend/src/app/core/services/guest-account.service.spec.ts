import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GuestSessionService } from '../auth/guest-session.service';
import { GuestAccount } from '../models/stay.models';
import { GuestAccountService } from './guest-account.service';

const account = (id: number): GuestAccount => ({
  id,
  name: `Guest ${id}`,
  email: `guest${id}@example.com`,
  profileImage: `https://randomuser.me/api/portraits/women/${id}.jpg`,
  createdAt: '',
  updatedAt: '',
});

describe('GuestAccountService', () => {
  let service: GuestAccountService;
  let session: GuestSessionService;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(GuestSessionService);
    session.session.set({ guestId: 4, name: 'Guest 4', email: 'guest4@example.com' });
    service = TestBed.inject(GuestAccountService);
    controller = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => controller.verify());

  it('loads the logged-in guest, and reloads when the guest changes', () => {
    controller.expectOne('/api/guests/4').flush(account(4));
    expect(service.account()?.profileImage).toBe('https://randomuser.me/api/portraits/women/4.jpg');

    session.session.set({ guestId: 5, name: 'Guest 5', email: 'guest5@example.com' });
    TestBed.tick();
    controller.expectOne('/api/guests/5').flush(account(5));
    expect(service.account()?.name).toBe('Guest 5');
  });

  it('is null for an unknown guest (empty 200), an error, or nobody logged in', () => {
    controller.expectOne('/api/guests/4').flush(null);
    expect(service.account()).toBeNull();

    session.session.set({ guestId: 6, name: 'Guest 6', email: 'guest6@example.com' });
    TestBed.tick();
    controller.expectOne('/api/guests/6').flush(null, { status: 500, statusText: 'Server Error' });
    expect(service.account()).toBeNull();

    session.logout();
    TestBed.tick();
    controller.expectNone((r) => r.url.startsWith('/api/guests/'));
    expect(service.account()).toBeNull();
  });
});
