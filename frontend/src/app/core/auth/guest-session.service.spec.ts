import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { authGuard, loggedOutGuard } from './auth.guards';
import { GuestSessionService } from './guest-session.service';

const STORAGE_KEY = 'stay.guestSession';
const PRASUN = { guestId: 5, name: 'Prasun', email: 'prasun@example.com' };

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  return {
    session: TestBed.inject(GuestSessionService),
    controller: TestBed.inject(HttpTestingController),
  };
}

describe('GuestSessionService', () => {
  beforeEach(() => localStorage.clear());

  it('logs in by email and persists the guest id', () => {
    const { session, controller } = setup();
    session.login('prasun@example.com').subscribe();

    const req = controller.expectOne('/api/guests/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'prasun@example.com' });
    req.flush(PRASUN);

    expect(session.guestId()).toBe(5);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(PRASUN);
  });

  it('restores the session from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(PRASUN));
    expect(setup().session.guestId()).toBe(5);
  });

  it('ignores malformed stored data', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(setup().session.isLoggedIn()).toBe(false);
  });

  it('clears localStorage on logout', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(PRASUN));
    const { session } = setup();
    session.logout();
    expect(session.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not start a session when login fails', () => {
    const { session, controller } = setup();
    session.login('nobody@example.com').subscribe({ error: () => {} });
    controller.expectOne('/api/guests/login').flush(null, { status: 404, statusText: 'Not Found' });
    expect(session.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('auth guards', () => {
  beforeEach(() => localStorage.clear());

  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  const urlOf = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('sends logged-out guests to /login', () => {
    setup();
    expect(urlOf(run(authGuard))).toBe('/login');
    expect(run(loggedOutGuard)).toBe(true);
  });

  it('lets logged-in guests through and skips /login', () => {
    setup().session.session.set(PRASUN);
    expect(run(authGuard)).toBe(true);
    expect(urlOf(run(loggedOutGuard))).toBe('/');
  });
});
