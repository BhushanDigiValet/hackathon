import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface GuestSession {
  guestId: number;
  name: string;
  email: string;
}

const STORAGE_KEY = 'stay.guestSession';

/**
 * Who is using the app. Persisted in localStorage so a refresh keeps the guest
 * logged in; the guest id is sent as `x-guest-id` by the guest-id interceptor.
 */
@Injectable({ providedIn: 'root' })
export class GuestSessionService {
  private readonly http = inject(HttpClient);

  readonly session = signal<GuestSession | null>(readStored());
  readonly guestId = computed(() => this.session()?.guestId ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  /** Resolves the guest for an email and starts their session. */
  login(email: string): Observable<GuestSession> {
    return this.http
      .post<GuestSession>(`${environment.apiBaseUrl}/guests/login`, { email })
      .pipe(
        map(({ guestId, name, email }) => ({ guestId, name, email })),
        tap((session) => {
          writeStored(session);
          this.session.set(session);
        }),
      );
  }

  logout(): void {
    writeStored(null);
    this.session.set(null);
  }
}

function readStored(): GuestSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return typeof value?.guestId === 'number' ? value : null;
  } catch {
    return null;
  }
}

function writeStored(session: GuestSession | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (e.g. private mode); the session lasts until reload.
  }
}
