import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';

import { GuestSessionService } from '../../core/auth/guest-session.service';
import { MOCK_BRAND_LOGO_URL } from '../../core/mocks/stay.mocks';

interface NavItem {
  label: string;
  icon: string;
  path?: string;
}

@Component({
  selector: 'app-tab-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './tab-shell.html',
  host: {
    '(document:click)': 'closeMenuOnOutsideClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
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
    { label: 'Stay', icon: 'bed', path: '/itinerary' },
    { label: 'Events', icon: 'auto_awesome', path: '/events' },
    { label: 'Circles', icon: 'groups' },
    { label: 'Concierge', icon: 'room_service' },
  ];

  /**
   * Section name under the brand, from the active child route's `section` data.
   * Read on NavigationEnd: while the shell is being created its child route isn't
   * activated yet, so walking the live tree then would hit an undefined snapshot.
   */
  protected readonly section = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let s = this.router.routerState.snapshot.root;
        while (s.firstChild) s = s.firstChild;
        return (s.data['section'] as string | undefined) ?? '';
      }),
    ),
    { initialValue: '' },
  );

  protected closeMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.accountMenu()?.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  protected signOut(): void {
    this.menuOpen.set(false);
    this.guestSession.logout();
    this.router.navigate(['/login']);
  }
}
