import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GuestSessionService } from '../auth/guest-session.service';
import { GuestAccount } from '../models/stay.models';

/** The logged-in guest's account (name, email, photo), reloaded whenever the guest changes. */
@Injectable({ providedIn: 'root' })
export class GuestAccountService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(GuestSessionService);

  /** `null` while loading, when nobody is logged in, or when the guest isn't found. */
  readonly account = toSignal(
    toObservable(this.session.guestId).pipe(
      switchMap((id) =>
        id === null
          ? of(null)
          : this.http.get<GuestAccount | null>(`${environment.apiBaseUrl}/guests/${id}`).pipe(
              // An unknown id answers 200 with an empty body.
              map((account) => (account?.id ? account : null)),
              catchError((err) => {
                console.error('Failed to load guest profile', err);
                return of(null);
              }),
            ),
      ),
    ),
    { initialValue: null },
  );
}
