import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';

import {
  PersonalizationOptions,
  ProfileDto,
  RefinedPreference,
  SynthesisStep,
  TravelCompanyOption,
} from '../../core/models/stay.models';
import { GuestSessionService } from '../../core/auth/guest-session.service';
import { ItineraryService } from '../../core/services/itinerary.service';
import { PersonalizationService } from '../../core/services/personalization.service';

type LoadState = 'loading' | 'error' | 'loaded';
type CreateState = 'idle' | 'loading' | 'ready';

@Component({
  selector: 'app-welcome-page',
  templateUrl: './welcome-page.html',
})
export class WelcomePage {
  private readonly personalization = inject(PersonalizationService);
  private readonly router = inject(Router);
  private readonly guestSession = inject(GuestSessionService);
  private readonly itinerary = inject(ItineraryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly guest = toSignal(this.personalization.getGuest());

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly options = signal<PersonalizationOptions | null>(null);
  protected readonly refinedPreferences = signal<RefinedPreference[]>([]);
  private profile: ProfileDto | null = null;

  protected readonly selectedMoods = signal<ReadonlySet<number>>(new Set());
  protected readonly paceId = signal<number | null>(null);
  protected readonly travelCompanyId = signal<number | null>(null);
  protected readonly openToGuestCircles = signal(false);
  protected readonly intention = signal('');

  protected readonly createState = signal<CreateState>('idle');
  protected readonly createError = signal(false);

  private readonly pace = computed(() => this.options()?.paces.find((p) => p.id === this.paceId()));
  protected readonly paceDescription = computed(() => this.pace()?.description ?? '');
  protected readonly summaryDescription = computed(
    () =>
      `1 day curated stay, ${(this.pace()?.label ?? 'balanced').toLowerCase()} pace, fine dining & restorative evening matched for two.`,
  );

  /** Index of the synthesis step in progress; earlier steps show as done. */
  private readonly activeStep = signal(0);
  private stepTimer?: ReturnType<typeof setInterval>;

  protected readonly synthesisSteps = computed<SynthesisStep[]>(() =>
    (this.options()?.synthesisSteps ?? []).map((label, i) => ({
      label,
      state: i < this.activeStep() ? 'done' : i === this.activeStep() ? 'active' : 'pending',
    })),
  );

  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => this.stopSteps());
  }

  protected load(): void {
    this.loadState.set('loading');
    forkJoin({
      options: this.personalization.getOptions(),
      profile: this.personalization.getProfile(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ options, profile }) => {
          this.options.set(options);
          this.profile = profile.source;
          this.refinedPreferences.set(profile.refinedPreferences);
          this.selectedMoods.set(new Set(profile.moodIds));
          this.paceId.set(profile.paceId);
          this.openToGuestCircles.set(profile.openToGuestCircles);
          // A saved Solo can't stand while open to guest circles; the guest picks again.
          const company = options.travelCompanies.find((c) => c.id === profile.travelCompanyId);
          this.travelCompanyId.set(company && !this.isCompanyBlocked(company) ? company.id : null);
          this.intention.set(profile.intention);
          this.loadState.set('loaded');
        },
        error: (err) => {
          console.error('Failed to load personalization', err);
          this.loadState.set('error');
        },
      });
  }

  protected toggleMood(id: number): void {
    this.selectedMoods.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /** Solo can't be picked while open to guest circles. */
  protected isCompanyBlocked(company: TravelCompanyOption): boolean {
    return company.solo && this.openToGuestCircles();
  }

  protected selectCompany(company: TravelCompanyOption): void {
    if (!this.isCompanyBlocked(company)) this.travelCompanyId.set(company.id);
  }

  /** Turning guest circles on clears a Solo selection, since Solo isn't allowed then. */
  protected toggleGuestCircles(): void {
    this.openToGuestCircles.update((open) => !open);
    const selected = this.options()?.travelCompanies.find((c) => c.id === this.travelCompanyId());
    if (selected && this.isCompanyBlocked(selected)) this.travelCompanyId.set(null);
  }

  protected signOut(): void {
    this.guestSession.logout();
    this.router.navigate(['/login']);
  }

  protected useDemoPrompt(): void {
    this.intention.set(this.options()?.demoPrompt ?? '');
  }

  protected createStay(): void {
    const paceId = this.paceId();
    const travelCompanyId = this.travelCompanyId();
    const profile = this.profile;
    if (this.createState() === 'loading' || !profile || paceId === null || travelCompanyId === null) {
      return;
    }
    if (this.createState() === 'ready') {
      this.router.navigate(['/itinerary']);
      return;
    }
    const guestId = this.guestSession.guestId();
    if (guestId === null) return;

    this.createError.set(false);
    this.createState.set('loading');
    this.startSteps();
    // Save the selections first, then have the LLM compose the itinerary from them.
    this.personalization
      .updateProfile(profile, {
        moodIds: [...this.selectedMoods()],
        paceId,
        travelCompanyId,
        openToGuestCircles: this.openToGuestCircles(),
        intention: this.intention(),
      })
      .pipe(
        switchMap((saved) => {
          // The API echoes the saved profile; keep it so a retry sends fresh data.
          this.profile = saved?.preferences ? saved : profile;
          const p = this.profile.preferences;
          return this.itinerary.createFromLlm({
            guestId,
            defaultPrompt: p.defaultPrompt,
            atmosphereMoodIds: p.atmosphereMoodIds,
            itineraryCadenceId: p.itineraryCadenceId,
            travelCompanyId: p.travelCompanyId,
            openToGuestCircles: p.openToGuestCircles,
            budgetTier: p.budgetTier,
            doNotDisturbBefore: p.doNotDisturbBefore,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.stopSteps();
          this.createState.set('ready');
        },
        error: (err) => {
          console.error('Failed to compose stay', err);
          this.stopSteps();
          this.createError.set(true);
          this.createState.set('idle');
        },
      });
  }

  /** Walks through the synthesis steps while the request is in flight, holding on the last one. */
  private startSteps(): void {
    this.stopSteps();
    this.activeStep.set(0);
    const last = (this.options()?.synthesisSteps.length ?? 1) - 1;
    this.stepTimer = setInterval(() => this.activeStep.update((i) => Math.min(i + 1, last)), 800);
  }

  private stopSteps(): void {
    clearInterval(this.stepTimer);
  }
}
