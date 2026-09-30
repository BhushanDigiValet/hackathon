import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, timer } from 'rxjs';

import { CircleCard, NUDGE_MESSAGE_MAX, SwipeAction } from '../../core/models/stay.models';
import { CirclesService } from '../../core/services/circles.service';
import { NudgeComposerService } from '../../core/services/nudge-composer.service';
import { PersonalizationService } from '../../core/services/personalization.service';
import { CELEBRATION_MS, JoinCelebration } from './join-celebration/join-celebration';

const FEED_LIMIT = 10;
const REFILL_BELOW = 3;
/** Drag distance (px) past which a release swipes the card away. */
const SWIPE_THRESHOLD = 110;
/** Release speed (px/ms) that counts as a flick, even below the threshold. */
const FLICK_VELOCITY = 0.5;
const FLICK_MIN_DISTANCE = 30;
const EXIT_MS = 360;
/** The ✓ / ✕ swipe indicators never become fully opaque, so the card shows through. */
const STAMP_MAX_OPACITY = 0.9;
const SNAP_MS = 450;
const TOAST_MS = 3500;

type LoadState = 'loading' | 'error' | 'loaded';

interface DragState {
  el: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  lastX: number;
  lastT: number;
  vx: number;
  frame: number;
}

@Component({
  selector: 'app-events-page',
  imports: [JoinCelebration],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class EventsPage {
  private readonly circles = inject(CirclesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  protected readonly guest = toSignal(inject(PersonalizationService).getGuest());

  protected readonly loadState = signal<LoadState>('loading');
  protected readonly cards = signal<CircleCard[]>([]);
  protected readonly resetting = signal(false);

  /** Top card plus the two peeking behind it; tracked by id so each keeps its element as it moves up. */
  protected readonly visibleCards = computed(() => this.cards().slice(0, 3));
  protected readonly active = computed<CircleCard | undefined>(() => this.cards()[0]);
  /** True while a card is flying off; blocks new swipes until the stack settles. */
  protected readonly exiting = signal(false);
  /** True from a join until we leave for the itinerary; only one gathering can be confirmed. */
  protected readonly joining = signal(false);
  protected readonly celebration = signal<{ title: string; suiteLabel: string; whenLabel: string } | null>(null);
  /** Bumped on every pass; re-creates the "Not tonight" feedback so its animation replays. */
  private readonly passCount = signal(0);
  protected readonly passFeedbackKeys = computed(() => (this.passCount() ? [this.passCount()] : []));

  protected readonly matchSheet = signal<CircleCard | null>(null);

  // Nudge sheet: a note for the top card's host, sent with the join.
  private readonly composer = inject(NudgeComposerService);
  protected readonly nudgeOpen = signal(false);
  protected readonly nudgeDraft = signal('');
  protected readonly nudgeMax = NUDGE_MESSAGE_MAX;
  protected readonly toast = signal<{ message: string; tone: 'success' | 'error' } | null>(null);
  /** Cards whose host photo failed to load; they fall back to initials. */
  protected readonly brokenAvatars = signal<ReadonlySet<number>>(new Set());

  private readonly stack = viewChild<ElementRef<HTMLElement>>('stack');
  private drag: DragState | null = null;
  /** Swiped this session; guards against a refill racing the swipe request. */
  private readonly swipedIds = new Set<number>();
  private refilling = false;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private readonly reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    this.load();
    // The footer's Nudge tab asks for the sheet; open it here, beside the card.
    effect(() => {
      if (!this.composer.pending()) return;
      untracked(() => {
        this.composer.pending.set(false);
        this.matchSheet.set(null);
        this.nudgeDraft.set('');
        this.nudgeOpen.set(true);
      });
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.toastTimer);
      this.endDrag();
    });
  }

  protected load(): void {
    this.loadState.set('loading');
    this.circles
      .getFeed(FEED_LIMIT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cards) => {
          this.cards.set(cards.filter((c) => !this.swipedIds.has(c.itineraryId)));
          this.loadState.set('loaded');
        },
        error: (err) => {
          console.error('Failed to load circles feed', err);
          this.loadState.set('error');
        },
      });
  }

  // --- Dragging -------------------------------------------------------------
  // Move/up listeners are plain DOM listeners and the card is moved once per
  // animation frame, so dragging never runs Angular change detection.

  protected onPointerDown(event: PointerEvent): void {
    const el = event.currentTarget as HTMLElement;
    if (this.exiting() || this.joining() || this.drag || event.button > 0) return;

    el.setPointerCapture?.(event.pointerId);
    el.style.transition = 'none';
    el.style.willChange = 'transform';
    this.stackEl()?.setAttribute('data-dragging', '');
    this.drag = {
      el,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
      frame: 0,
    };
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerCancel);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const d = this.drag;
    if (!d || event.pointerId !== d.pointerId) return;
    const dt = Math.max(event.timeStamp - d.lastT, 1);
    // Smoothed horizontal velocity, used to detect flicks on release.
    d.vx = 0.7 * ((event.clientX - d.lastX) / dt) + 0.3 * d.vx;
    d.lastX = event.clientX;
    d.lastT = event.timeStamp;
    d.dx = event.clientX - d.startX;
    d.dy = event.clientY - d.startY;
    if (!d.frame) d.frame = requestAnimationFrame(() => this.renderDrag());
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const d = this.drag;
    if (!d || event.pointerId !== d.pointerId) return;
    const { dx, vx } = d;
    const flick = Math.abs(vx) > FLICK_VELOCITY && Math.abs(dx) > FLICK_MIN_DISTANCE && Math.sign(vx) === Math.sign(dx);
    if (dx > SWIPE_THRESHOLD || (flick && dx > 0)) this.swipe('join');
    else if (dx < -SWIPE_THRESHOLD || (flick && dx < 0)) this.swipe('pass');
    else this.snapBack();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.drag && event.pointerId === this.drag.pointerId) this.snapBack();
  };

  private renderDrag(): void {
    const d = this.drag;
    if (!d) return;
    d.frame = 0;
    const progress = Math.min(Math.abs(d.dx) / SWIPE_THRESHOLD, 1);
    d.el.style.transform = `translate3d(${d.dx}px, ${d.dy * 0.3}px, 0) rotate(${d.dx * 0.06}deg)`;
    this.stackEl()?.style.setProperty('--p', String(progress));
    this.setStamp(d.el, d.dx > 0 ? 'join' : 'pass', progress);
  }

  /** Springs the card back to rest when released short of the threshold. */
  private snapBack(): void {
    const el = this.drag?.el;
    this.endDrag();
    if (!el) return;
    this.stackEl()?.removeAttribute('data-dragging');
    this.stackEl()?.style.setProperty('--p', '0');
    this.setStamp(el, null, 0);
    el.style.transition = `transform ${this.ms(SNAP_MS)}ms cubic-bezier(0.18, 1.35, 0.4, 1)`;
    el.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
    setTimeout(() => {
      if (el.isConnected && !this.drag) {
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
      }
    }, this.ms(SNAP_MS));
  }

  private endDrag(): void {
    const d = this.drag;
    if (!d) return;
    cancelAnimationFrame(d.frame);
    d.el.removeEventListener('pointermove', this.onPointerMove);
    d.el.removeEventListener('pointerup', this.onPointerUp);
    d.el.removeEventListener('pointercancel', this.onPointerCancel);
    if (d.el.hasPointerCapture?.(d.pointerId)) d.el.releasePointerCapture(d.pointerId);
    this.drag = null;
  }

  /** Escape closes the sheets. Joining and passing happen only by swiping the card. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.matchSheet.set(null);
      this.nudgeOpen.set(false);
    }
  }

  // --- Swiping --------------------------------------------------------------

  /** Joins the top card with the guest's note, which the host receives as a nudge. */
  protected sendNudge(): void {
    const message = this.nudgeDraft().trim();
    this.nudgeOpen.set(false);
    this.swipe('join', message || undefined);
  }

  protected closeNudge(): void {
    this.nudgeOpen.set(false);
  }

  /** Flies the top card off (continuing from any drag) and records the swipe. */
  protected swipe(action: SwipeAction, message?: string): void {
    const card = this.active();
    if (!card || this.exiting() || this.joining()) return;

    const drag = this.drag;
    this.endDrag();
    this.exiting.set(true);
    this.swipedIds.add(card.itineraryId);

    const stack = this.stackEl();
    const el = drag?.el ?? stack?.querySelector<HTMLElement>('[data-index="0"]') ?? null;
    if (el && stack) {
      const sign = action === 'join' ? 1 : -1;
      const x = sign * (window.innerWidth + el.offsetWidth);
      const y = (drag?.dy ?? 0) * 0.3 + (drag ? 0 : -40);
      const duration = this.ms(EXIT_MS);
      // Join sweeps confidently away; pass recedes, smaller and gentler.
      const end =
        action === 'join'
          ? `translate3d(${x}px, ${y}px, 0) rotate(24deg)`
          : `translate3d(${x * 0.8}px, ${y + 30}px, 0) rotate(-10deg) scale(0.85)`;
      // Let the cards behind animate up while this one leaves.
      stack.removeAttribute('data-dragging');
      stack.style.setProperty('--p', '1');
      this.setStamp(el, action, 1);
      el.style.transition = `transform ${duration}ms cubic-bezier(0.3, 0.5, 0.4, 1), opacity ${duration}ms ease-in`;
      el.style.willChange = 'transform';
      // Next frame, so a keyboard/button swipe transitions from rest instead of jumping.
      requestAnimationFrame(() => {
        el.style.transform = end;
        el.style.opacity = '0';
      });
    }

    if (action === 'join') this.join(card, message);
    else this.pass(card);

    setTimeout(() => this.removeCard(card.itineraryId, action === 'pass'), this.ms(EXIT_MS));
  }

  /**
   * A guest confirms one gathering at a time: celebrate, then take them to
   * their itinerary once the join is confirmed and the moment has played out.
   */
  private join(card: CircleCard, message?: string): void {
    this.joining.set(true);
    setTimeout(() => {
      if (this.joining()) {
        this.celebration.set({ title: card.title, suiteLabel: card.host.suiteLabel, whenLabel: card.whenLabel });
      }
    }, this.ms(160));

    forkJoin([this.circles.swipe(card.itineraryId, 'join', message), timer(this.ms(CELEBRATION_MS))])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/itinerary']),
        error: (err) => {
          console.error('Failed to join gathering', err);
          this.joining.set(false);
          this.celebration.set(null);
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          if (status === 409) {
            // Full: no nudge was sent and the card stays gone.
            this.showToast('That gathering just filled up. No nudge was sent.', 'error');
            return;
          }
          this.showToast(
            status === 400
              ? 'You can’t join this gathering. No nudge was sent.'
              : 'We couldn’t confirm your place. Please try again.',
            'error',
          );
          // Put the card back on top once its fly-off has finished.
          setTimeout(() => {
            this.swipedIds.delete(card.itineraryId);
            this.cards.update((cards) =>
              cards.some((c) => c.itineraryId === card.itineraryId) ? cards : [card, ...cards],
            );
          }, this.ms(EXIT_MS) + 50);
        },
      });
  }

  private pass(card: CircleCard): void {
    this.passCount.update((n) => n + 1);
    this.circles
      .swipe(card.itineraryId, 'pass')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: (err) => console.error('Failed to record pass', err) });
  }

  /**
   * Drops the swiped card and resets the stack's drag progress in the same
   * frame, so the cards that moved up keep exactly the pose they animated to.
   */
  private removeCard(itineraryId: number, refill: boolean): void {
    const stack = this.stackEl();
    stack?.setAttribute('data-dragging', ''); // no transitions for the re-index
    this.cards.update((cards) => cards.filter((c) => c.itineraryId !== itineraryId));
    afterNextRender(
      {
        write: () => {
          stack?.style.setProperty('--p', '0');
          requestAnimationFrame(() => {
            stack?.removeAttribute('data-dragging');
            this.exiting.set(false);
          });
        },
      },
      { injector: this.injector },
    );
    if (refill && this.cards().length < REFILL_BELOW) this.refill();
  }

  /** Appends feed cards that aren't already on screen or swiped. */
  private refill(): void {
    if (this.refilling) return;
    this.refilling = true;
    this.circles
      .getFeed(FEED_LIMIT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (feed) => {
          this.refilling = false;
          const onScreen = new Set(this.cards().map((c) => c.itineraryId));
          const fresh = feed.filter((c) => !onScreen.has(c.itineraryId) && !this.swipedIds.has(c.itineraryId));
          if (fresh.length) this.cards.update((cards) => [...cards, ...fresh]);
        },
        error: (err) => {
          this.refilling = false;
          console.error('Failed to refill circles feed', err);
        },
      });
  }

  protected startOver(): void {
    if (this.resetting()) return;
    this.resetting.set(true);
    this.circles
      .resetSwipes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resetting.set(false);
          this.swipedIds.clear();
          this.load();
        },
        error: (err) => {
          this.resetting.set(false);
          console.error('Failed to reset swipes', err);
          this.showToast('We couldn’t start over. Please try again.', 'error');
        },
      });
  }

  // --- Helpers --------------------------------------------------------------

  protected openMatch(card: CircleCard, event: Event): void {
    event.stopPropagation();
    this.matchSheet.set(card);
  }

  protected markAvatarBroken(itineraryId: number): void {
    this.brokenAvatars.update((ids) => new Set(ids).add(itineraryId));
  }

  /** Shows the ✓ (join) or ✕ (pass) indicator for `progress` 0..1: it fades in and grows, staying translucent. */
  private setStamp(card: HTMLElement, action: SwipeAction | null, progress: number): void {
    card.querySelectorAll<HTMLElement>('[data-stamp]').forEach((stamp) => {
      const shown = stamp.dataset['stamp'] === action ? progress : 0;
      stamp.style.opacity = String(shown * STAMP_MAX_OPACITY);
      stamp.style.transform = `scale(${0.6 + 0.4 * shown})`;
    });
  }

  private stackEl(): HTMLElement | undefined {
    return this.stack()?.nativeElement;
  }

  private ms(duration: number): number {
    return this.reducedMotion ? 1 : duration;
  }

  private showToast(message: string, tone: 'success' | 'error'): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ message, tone });
    this.toastTimer = setTimeout(() => this.toast.set(null), TOAST_MS);
  }
}
