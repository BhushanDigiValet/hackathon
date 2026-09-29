import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GuestSessionService } from '../auth/guest-session.service';
import { Nudge, NudgesResponse } from '../models/stay.models';

export const NUDGE_POLL_MS = 12_000;
const PAGE_SIZE = 20;
const KEEP_MAX = 50;

/**
 * The logged-in guest's nudge inbox (notes from guests who joined their
 * gatherings), kept fresh by polling with `afterId`.
 *
 * `latestId` lives in memory only: the backend reseeds on restart and ids start
 * again from 1, so a stored one would hide new nudges.
 */
@Injectable({ providedIn: 'root' })
export class NudgesService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(GuestSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/nudges`;

  readonly nudges = signal<Nudge[]>([]);
  readonly unreadCount = signal(0);
  readonly loaded = signal(false);

  private latestId = 0;
  /** Guest the inbox belongs to; starts as the current one so start-up isn't seen as a switch. */
  private guestId: number | null = this.session.guestId();
  private users = 0;
  private timer?: ReturnType<typeof setInterval>;
  private inFlight?: Subscription;
  private readonly onVisibility = () => {
    if (document.hidden) {
      this.stopTimer();
    } else {
      this.poll(); // catch up once on resume
      this.startTimer();
    }
  };

  constructor() {
    // Switching guests (or logging out) starts a fresh inbox.
    effect(() => {
      const id = this.session.guestId();
      untracked(() => {
        if (id === this.guestId) return;
        this.reset();
        this.guestId = id;
        if (id !== null && this.users > 0) this.poll();
      });
    });
    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /** Begin polling while a screen that shows nudges is open; pair with `stop()`. */
  start(): void {
    if (++this.users > 1) return;
    document.addEventListener('visibilitychange', this.onVisibility);
    this.poll();
    if (!document.hidden) this.startTimer();
  }

  stop(): void {
    if (this.users === 0 || --this.users > 0) return;
    this.teardown();
  }

  /** Marks one nudge read, e.g. when it is tapped. */
  markRead(nudge: Nudge): void {
    if (nudge.isRead) return;
    this.nudges.update((list) => list.map((n) => (n.id === nudge.id ? { ...n, isRead: true } : n)));
    this.unreadCount.update((c) => Math.max(0, c - 1));
    this.http.patch(`${this.baseUrl}/${nudge.id}/read`, {}).subscribe({
      error: (err) => {
        console.error('Failed to mark nudge read', err);
        this.refreshCount();
      },
    });
  }

  markAllRead(): void {
    if (this.unreadCount() === 0 && this.nudges().every((n) => n.isRead)) return;
    this.nudges.update((list) => list.map((n) => (n.isRead ? n : { ...n, isRead: true })));
    this.unreadCount.set(0);
    this.http.patch(`${this.baseUrl}/read-all`, {}).subscribe({
      error: (err) => {
        console.error('Failed to mark nudges read', err);
        this.refreshCount();
      },
    });
  }

  /** First load without afterId, then only what is newer than the last latestId. */
  private poll(): void {
    const guestId = this.session.guestId();
    if (guestId === null || this.inFlight) return;
    const params: Record<string, number> = { limit: PAGE_SIZE };
    if (this.latestId > 0) params['afterId'] = this.latestId;

    this.inFlight = this.http.get<NudgesResponse>(this.baseUrl, { params }).subscribe({
      next: (res) => {
        this.inFlight = undefined;
        if (this.session.guestId() !== guestId) return; // answer for a previous guest
        const known = new Set(this.nudges().map((n) => n.id));
        const fresh = res.nudges.filter((n) => !known.has(n.id));
        if (fresh.length) this.nudges.update((list) => [...fresh, ...list].slice(0, KEEP_MAX));
        this.unreadCount.set(res.unreadCount);
        this.latestId = Math.max(this.latestId, res.latestId);
        this.loaded.set(true);
      },
      error: (err) => {
        this.inFlight = undefined;
        console.error('Failed to load nudges', err);
      },
    });
  }

  private refreshCount(): void {
    this.http.get<{ unreadCount: number }>(`${this.baseUrl}/unread-count`).subscribe({
      next: (res) => this.unreadCount.set(res.unreadCount),
      error: (err) => console.error('Failed to load unread nudge count', err),
    });
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => this.poll(), NUDGE_POLL_MS);
  }

  private stopTimer(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private reset(): void {
    this.inFlight?.unsubscribe();
    this.inFlight = undefined;
    this.latestId = 0;
    this.nudges.set([]);
    this.unreadCount.set(0);
    this.loaded.set(false);
  }

  private teardown(): void {
    this.users = 0;
    this.stopTimer();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
