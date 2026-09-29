import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { MOCK_INVITATIONS } from '../mocks/stay.mocks';
import { Invitation, InvitationResponse } from '../models/stay.models';

// TODO(api): replace the mock observables with Apollo queries/mutations.
@Injectable({ providedIn: 'root' })
export class InvitationsService {
  getNearbyInvitations(): Observable<Invitation[]> {
    return of(MOCK_INVITATIONS);
  }

  respond(invitationId: string, response: InvitationResponse): Observable<boolean> {
    console.info(`[mock] invitation ${invitationId} ${response}`);
    return of(true);
  }
}
