import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ProfileDto } from '../models/stay.models';
import { PersonalizationService } from './personalization.service';

const PROFILE: ProfileDto = {
  id: 5,
  guestId: 5,
  preferences: {
    budgetTier: 'Tier 4 - Unrestricted',
    defaultPrompt: 'Old prompt',
    travelCompanyId: 3,
    atmosphereMoodIds: [4, 6],
    doNotDisturbBefore: '10:00 AM',
    itineraryCadenceId: 2,
    openToGuestCircles: true,
  },
  createdAt: '2026-09-29T11:25:17.572Z',
  updatedAt: '2026-09-29T12:01:17.000Z',
};

describe('PersonalizationService', () => {
  let service: PersonalizationService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PersonalizationService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('PUTs the loaded profile with the selections applied', () => {
    let saved: ProfileDto | undefined;
    service
      .updateProfile(PROFILE, {
        moodIds: [2],
        paceId: 1,
        travelCompanyId: 2,
        openToGuestCircles: false,
        intention: "I've had a crazy few months.",
      })
      .subscribe((res) => (saved = res));

    const req = controller.expectOne('/api/profile');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      ...PROFILE,
      preferences: {
        budgetTier: 'Tier 4 - Unrestricted',
        defaultPrompt: "I've had a crazy few months.",
        travelCompanyId: 2,
        atmosphereMoodIds: [2],
        doNotDisturbBefore: '10:00 AM',
        itineraryCadenceId: 1,
        openToGuestCircles: false,
      },
    });
    req.flush(req.request.body);
    expect(saved?.preferences.itineraryCadenceId).toBe(1);
  });
});
