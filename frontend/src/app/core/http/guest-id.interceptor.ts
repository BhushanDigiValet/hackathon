import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { GuestSessionService } from '../auth/guest-session.service';

/** Identifies the logged-in guest on every REST API call. */
export const guestIdInterceptor: HttpInterceptorFn = (req, next) => {
  const guestId = inject(GuestSessionService).guestId();
  if (guestId === null || !req.url.startsWith(environment.apiBaseUrl)) return next(req);
  return next(req.clone({ setHeaders: { 'x-guest-id': String(guestId) } }));
};
