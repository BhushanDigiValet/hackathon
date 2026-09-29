import { Component, input } from '@angular/core';

interface Bubble {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

interface Glint {
  x: number;
  y: number;
  size: number;
  delay: number;
}

/** How long the celebration plays before the guest is taken to their itinerary. */
export const CELEBRATION_MS = 2600;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Full-screen "You're in" moment after joining a gathering: a gold ring draws
 * around a check mark while champagne bubbles rise. Pure CSS/SVG animation.
 */
@Component({
  selector: 'app-join-celebration',
  templateUrl: './join-celebration.html',
  styleUrl: './join-celebration.scss',
  host: {
    role: 'status',
    'aria-live': 'assertive',
    '[style.--duration]': 'duration + "ms"',
  },
})
export class JoinCelebration {
  readonly title = input.required<string>();
  readonly suiteLabel = input.required<string>();
  readonly whenLabel = input('');

  protected readonly duration = CELEBRATION_MS;

  protected readonly bubbles: Bubble[] = Array.from({ length: 18 }, () => ({
    left: random(6, 94),
    size: random(3, 7),
    delay: random(0.2, 1.4),
    duration: random(2.2, 3.4),
    drift: random(-24, 24),
  }));

  /** Glints sit on a circle around the ring. */
  protected readonly glints: Glint[] = Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * Math.PI * 2 - Math.PI / 2 + random(-0.2, 0.2);
    const radius = random(78, 96);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      size: random(8, 14),
      delay: 0.7 + i * 0.12,
    };
  });
}
