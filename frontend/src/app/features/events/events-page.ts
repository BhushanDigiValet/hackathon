import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { InvitationResponse } from '../../core/models/stay.models';
import { InvitationsService } from '../../core/services/invitations.service';
import { PersonalizationService } from '../../core/services/personalization.service';

const SWIPE_THRESHOLD = 100;
const EXIT_MS = 300;

@Component({
  selector: 'app-events-page',
  templateUrl: './events-page.html',
})
export class EventsPage {
  private readonly invitationsService = inject(InvitationsService);

  protected readonly guest = toSignal(inject(PersonalizationService).getGuest());
  protected readonly invitations = toSignal(this.invitationsService.getNearbyInvitations(), {
    initialValue: [],
  });

  protected readonly index = signal(0);
  protected readonly dragX = signal(0);
  protected readonly dragging = signal(false);
  protected readonly exiting = signal<InvitationResponse | null>(null);

  protected readonly active = computed(() => this.invitations()[this.index()]);
  protected readonly next = computed(() => this.invitations()[this.index() + 1]);
  protected readonly afterNext = computed(() => this.invitations()[this.index() + 2]);
  protected readonly remaining = computed(() => Math.max(this.invitations().length - this.index(), 0));

  protected readonly cardTransform = computed(() => {
    const exit = this.exiting();
    // Per the design copy: swipe right to pass, swipe left to accept.
    if (exit) return exit === 'passed' ? 'translateX(120%) rotate(12deg)' : 'translateX(-120%) rotate(-12deg)';
    const x = this.dragX();
    return `translateX(${x}px) rotate(${x / 20}deg)`;
  });

  /** Hint shown while dragging, fades in with distance. */
  protected readonly dragHint = computed(() => {
    const x = this.dragX();
    if (Math.abs(x) < 24) return null;
    return { label: x > 0 ? 'Pass' : 'Join', opacity: Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1), right: x < 0 };
  });

  private startX = 0;

  protected onPointerDown(event: PointerEvent): void {
    if (this.exiting()) return;
    this.startX = event.clientX;
    this.dragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging()) this.dragX.set(event.clientX - this.startX);
  }

  protected onPointerUp(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    const x = this.dragX();
    if (x > SWIPE_THRESHOLD) this.respond('passed');
    else if (x < -SWIPE_THRESHOLD) this.respond('accepted');
    else this.dragX.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.respond('passed');
    else if (event.key === 'ArrowLeft' || event.key === 'Enter') this.respond('accepted');
  }

  protected respond(response: InvitationResponse): void {
    const invitation = this.active();
    if (!invitation || this.exiting()) return;
    this.exiting.set(response);
    this.invitationsService.respond(invitation.id, response).subscribe();
    setTimeout(() => {
      this.exiting.set(null);
      this.dragX.set(0);
      this.index.update((i) => i + 1);
    }, EXIT_MS);
  }

  protected restart(): void {
    this.index.set(0);
  }
}
