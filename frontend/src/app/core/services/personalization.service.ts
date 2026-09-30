import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MOCK_GUEST, MOCK_PERSONALIZATION } from '../mocks/stay.mocks';
import {
  GuestContext,
  GuestPreferencesInput,
  GuestProfile,
  PersonalizationOptions,
  ProfileDto,
  ProfileOptionsDto,
} from '../models/stay.models';

/** The API sends generic icon names; map them to Material Symbols glyphs. */
const ICON_ALIASES: Record<string, string> = {
  heart: 'favorite',
  group: 'groups',
  family: 'family_restroom',
};

/**
 * Display labels for the travel company options, by id (the API's names are
 * "Just me", "With my partner", "With friends", "With family"). Ids, icons and
 * the values saved to the profile are unchanged.
 */
const TRAVEL_COMPANY_LABELS: Record<number, string> = { 1: 'Solo', 2: 'Duo', 3: 'Trio', 4: 'Group' };
const SOLO_TRAVEL_COMPANY_ID = 1;

@Injectable({ providedIn: 'root' })
export class PersonalizationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/profile`;

  // TODO(api): no endpoint yet.
  getGuest(): Observable<GuestContext> {
    return of(MOCK_GUEST);
  }

  getOptions(): Observable<PersonalizationOptions> {
    return this.http.get<ProfileOptionsDto>(`${this.baseUrl}/options`).pipe(
      map((dto) => ({
        ...MOCK_PERSONALIZATION,
        moods: dto.atmosphereAndMood
          .filter((o) => o.isActive)
          .map((o) => ({ id: o.id, label: o.name })),
        paces: dto.itineraryCadence
          .filter((o) => o.isActive)
          .map((o) => ({ id: o.id, label: o.name, description: o.description })),
        travelCompanies: dto.travelCompany
          .filter((o) => o.isActive)
          .map((o) => ({
            id: o.id,
            label: TRAVEL_COMPANY_LABELS[o.id] ?? o.name,
            icon: ICON_ALIASES[o.icon] ?? o.icon,
            solo: o.id === SOLO_TRAVEL_COMPANY_ID,
          })),
      })),
    );
  }

  getProfile(): Observable<GuestProfile> {
    return this.http.get<ProfileDto>(this.baseUrl).pipe(
      map((dto) => ({ dto, p: dto.preferences })),
      map(({ dto, p }): GuestProfile => ({
        source: dto,
        moodIds: p.atmosphereMoodIds,
        paceId: p.itineraryCadenceId,
        travelCompanyId: p.travelCompanyId,
        openToGuestCircles: p.openToGuestCircles,
        intention: p.defaultPrompt,
        refinedPreferences: [
          {
            id: 'dnd',
            label: 'Do not disturb before',
            hint: 'Morning tea & wellness wake time',
            value: p.doNotDisturbBefore,
          },
          {
            id: 'budget',
            label: 'Budget tier',
            hint: 'Sommelier reserve & private cabanas',
            value: p.budgetTier,
          },
        ],
      })),
    );
  }

  /**
   * Saves the guest's selections onto their loaded profile; called when they
   * compose their stay. Fields the screen doesn't edit are sent back unchanged.
   */
  updateProfile(profile: ProfileDto, input: GuestPreferencesInput): Observable<ProfileDto> {
    const body: ProfileDto = {
      ...profile,
      preferences: {
        ...profile.preferences,
        atmosphereMoodIds: input.moodIds,
        itineraryCadenceId: input.paceId,
        travelCompanyId: input.travelCompanyId,
        openToGuestCircles: input.openToGuestCircles,
        defaultPrompt: input.intention,
      },
    };
    return this.http.put<ProfileDto>(this.baseUrl, body);
  }
}
