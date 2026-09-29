import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GuestSessionService } from '../auth/guest-session.service';
import { guestIdInterceptor } from './guest-id.interceptor';

describe('guestIdInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let session: GuestSessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([guestIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    session = TestBed.inject(GuestSessionService);
  });

  afterEach(() => controller.verify());

  it('adds the logged-in guest id to API requests', () => {
    session.session.set({ guestId: 4, name: 'Anuj', email: 'anuj@example.com' });
    http.get('/api/profile').subscribe();
    expect(controller.expectOne('/api/profile').request.headers.get('x-guest-id')).toBe('4');
  });

  it('sends no guest id when nobody is logged in', () => {
    http.post('/api/guests/login', {}).subscribe();
    expect(controller.expectOne('/api/guests/login').request.headers.has('x-guest-id')).toBe(false);
  });

  it('leaves non-API requests untouched', () => {
    session.session.set({ guestId: 5, name: 'Prasun', email: 'prasun@example.com' });
    http.get('/graphql').subscribe();
    expect(controller.expectOne('/graphql').request.headers.has('x-guest-id')).toBe(false);
  });
});
