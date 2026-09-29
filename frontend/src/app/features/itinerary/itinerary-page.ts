import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ItineraryDay } from '../../core/models/stay.models';
import { ItineraryService } from '../../core/services/itinerary.service';

/** `empty`: the guest has no itinerary yet (the API answers 404), which is normal before composing one. */
type LoadState = 'loading' | 'error' | 'empty' | 'loaded';

@Component({
  selector: 'app-itinerary-page',
  imports: [RouterLink],
  templateUrl: './itinerary-page.html',
})
export class ItineraryPage {
  private readonly itinerary = inject(ItineraryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly day = signal<ItineraryDay | null>(null);
  protected readonly playing = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadState.set('loading');
    this.itinerary
      .getItinerary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (day) => {
          this.day.set(day);
          this.loadState.set(day.items.length ? 'loaded' : 'empty');
        },
        error: (err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.loadState.set('empty');
            return;
          }
          console.error('Failed to load itinerary', err);
          this.loadState.set('error');
        },
      });
  }
}
