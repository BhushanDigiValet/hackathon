import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { GuestSessionService } from '../../core/auth/guest-session.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly session = inject(GuestSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly email = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(event: Event): void {
    event.preventDefault();
    const email = this.email().trim();
    if (!EMAIL_PATTERN.test(email)) {
      this.error.set('Please enter a valid email address.');
      return;
    }
    if (this.submitting()) return;

    this.error.set(null);
    this.submitting.set(true);
    this.session
      .login(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.error.set(
            err.status === 404
              ? 'We couldn’t find a stay for that email.'
              : 'We couldn’t reach your concierge. Please try again.',
          );
        },
      });
  }
}
