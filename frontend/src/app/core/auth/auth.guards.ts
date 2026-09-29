import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { GuestSessionService } from './guest-session.service';

/** Screens that need a logged-in guest; sends everyone else to /login. */
export const authGuard: CanActivateFn = () =>
  inject(GuestSessionService).isLoggedIn() || inject(Router).createUrlTree(['/login']);

/** The login screen; skips it when a guest is already logged in. */
export const loggedOutGuard: CanActivateFn = () =>
  !inject(GuestSessionService).isLoggedIn() || inject(Router).createUrlTree(['/']);
