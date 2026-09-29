import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GuestSessionService } from '../../core/auth/guest-session.service';
import { ProfileDto } from '../../core/models/stay.models';
import { WelcomePage } from './welcome-page';

const OPTIONS = {
  atmosphereAndMood: [
    { id: 1, name: 'Relaxed', isActive: true },
    { id: 6, name: 'Recharge', isActive: true },
  ],
  itineraryCadence: [{ id: 1, name: 'Slow', description: 'Take your time.', isActive: true }],
  travelCompany: [{ id: 2, name: 'With my partner', icon: 'heart', isActive: true }],
};

const PROFILE: ProfileDto = {
  id: 5,
  guestId: 5,
  preferences: {
    budgetTier: 'Tier 4 - Unrestricted',
    defaultPrompt: 'I want to fully unwind',
    travelCompanyId: 2,
    atmosphereMoodIds: [1, 6],
    doNotDisturbBefore: '10:00 AM',
    itineraryCadenceId: 1,
    openToGuestCircles: false,
  },
  createdAt: '',
  updatedAt: '',
};

const LLM_URL = '/api/plan/createItenaryFromLlm';

describe('WelcomePage compose', () => {
  let fixture: ComponentFixture<WelcomePage>;
  let controller: HttpTestingController;
  let el: HTMLElement;

  const composeButton = () =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.includes('Compose my stay'))!;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [WelcomePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(GuestSessionService).session.set({ guestId: 5, name: 'Guest 5', email: 'guest5@example.com' });
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WelcomePage);
    el = fixture.nativeElement;
    fixture.detectChanges();
    controller.expectOne('/api/profile/options').flush(OPTIONS);
    controller.expectOne((r) => r.url === '/api/profile' && r.method === 'GET').flush(PROFILE);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => controller.verify());

  it('saves the profile, then asks the LLM with every selection', () => {
    composeButton().click();
    fixture.detectChanges();
    expect(el.textContent).toContain('AI orchestration synthesis');

    const put = controller.expectOne((r) => r.url === '/api/profile' && r.method === 'PUT');
    controller.expectNone(LLM_URL); // waits for the save
    put.flush(PROFILE);

    const llm = controller.expectOne(LLM_URL);
    expect(llm.request.method).toBe('POST');
    expect(llm.request.body).toEqual({
      guestId: 5,
      defaultPrompt: 'I want to fully unwind',
      atmosphereMoodIds: [1, 6],
      itineraryCadenceId: 1,
      travelCompanyId: 2,
      openToGuestCircles: false,
      budgetTier: 'Tier 4 - Unrestricted',
      doNotDisturbBefore: '10:00 AM',
    });

    llm.flush({});
    fixture.detectChanges();
    expect(el.textContent).toContain('Itinerary personal invitation ready');
    expect(el.textContent).not.toContain('AI orchestration synthesis');
  });

  it('shows an error and lets the guest retry when the LLM call fails', () => {
    composeButton().click();
    controller.expectOne((r) => r.url === '/api/profile' && r.method === 'PUT').flush(PROFILE);
    controller.expectOne(LLM_URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('We couldn’t compose your stay');
    expect(composeButton()).toBeTruthy();
    expect(el.textContent).not.toContain('AI orchestration synthesis');
  });
});
