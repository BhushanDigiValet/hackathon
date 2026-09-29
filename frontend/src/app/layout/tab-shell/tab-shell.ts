import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Data,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';

import { GuestSessionService } from '../../core/auth/guest-session.service';
import { MOCK_BRAND_LOGO_URL } from '../../core/mocks/stay.mocks';
import { Nudge } from '../../core/models/stay.models';
import { NudgeComposerService } from '../../core/services/nudge-composer.service';
import { NudgesService } from '../../core/services/nudges.service';

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  action?: () => void;
}

@Component({
  selector: 'app-tab-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './tab-shell.html',
  host: {
    '(document:click)': 'closeMenuOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeMenus()',
  },
})
export class TabShell {
  private readonly router = inject(Router);
  private readonly guestSession = inject(GuestSessionService);

  protected readonly session = this.guestSession.session;
  protected readonly menuOpen = signal(false);
  private readonly accountMenu = viewChild<ElementRef<HTMLElement>>('accountMenu');

  protected readonly logoUrl = MOCK_BRAND_LOGO_URL;

  protected readonly navItems: NavItem[] = [
    { label: 'Plan', icon: 'tune', path: '/' },
    { label: 'Stay', icon: 'bed', path: '/itinerary' },
    { label: 'Events', icon: 'auto_awesome', path: '/events' },
    { label: 'Nudge', icon: 'waving_hand', action: () => this.openNudge() },
    { label: 'Concierge', icon: 'room_service' },
  ];

  // Nudge inbox behind the header bell; polled while the shell is open.
  private readonly nudgesService = inject(NudgesService);
  private readonly composer = inject(NudgeComposerService);
  protected readonly nudges = this.nudgesService.nudges;
  protected readonly unreadCount = this.nudgesService.unreadCount;
  protected readonly bellOpen = signal(false);
  private readonly bellMenu = viewChild<ElementRef<HTMLElement>>('bellMenu');

  /**
   * The active child route's data: `section` (name under the brand) and
   * `hideHeader` (screens with their own hero, like Welcome).
   * Read on NavigationEnd: while the shell is being created its child route isn't
   * activated yet, so walking the live tree then would hit an undefined snapshot.
   */
  private readonly routeData = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let s = this.router.routerState.snapshot.root;
        while (s.firstChild) s = s.firstChild;
        return s.data;
      }),
    ),
    { initialValue: {} as Data },
  );
  protected readonly section = computed(() => (this.routeData()['section'] as string | undefined) ?? '');
  protected readonly showHeader = computed(() => !this.routeData()['hideHeader']);

  constructor() {
    this.nudgesService.start();
    inject(DestroyRef).onDestroy(() => this.nudgesService.stop());
  }

  protected closeMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (!this.accountMenu()?.nativeElement.contains(target)) this.menuOpen.set(false);
    if (!this.bellMenu()?.nativeElement.contains(target)) this.bellOpen.set(false);
  }

  protected closeMenus(): void {
    this.menuOpen.set(false);
    this.bellOpen.set(false);
  }

  protected toggleBell(): void {
    this.menuOpen.set(false);
    this.bellOpen.update((open) => !open);
  }

  protected markRead(nudge: Nudge): void {
    this.nudgesService.markRead(nudge);
  }

  protected markAllRead(): void {
    this.nudgesService.markAllRead();
  }

  /** The Nudge tab: the note sheet lives on Events, next to the current invitation. */
  private openNudge(): void {
    this.closeMenus();
    this.composer.request();
    if (!this.router.url.startsWith('/events')) this.router.navigate(['/events']);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }

  /** "just now", "5m", "3h", "2d". */
  protected timeAgo(iso: string): string {
    const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86_400)}d`;
  }

  protected signOut(): void {
    this.closeMenus();
    this.guestSession.logout();
    this.router.navigate(['/login']);
  }
}
