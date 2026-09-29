import { Injectable, signal } from '@angular/core';

/**
 * Hands the footer's Nudge tab over to the Events screen, which owns the
 * current invitation card and shows the note sheet for it.
 */
@Injectable({ providedIn: 'root' })
export class NudgeComposerService {
  /** Set by the Nudge tab; the Events screen opens its sheet and clears it. */
  readonly pending = signal(false);

  request(): void {
    this.pending.set(true);
  }
}
