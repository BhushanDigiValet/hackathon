import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { circleDto } from '../../core/services/circles.service.spec';
import { NudgeComposerService } from '../../core/services/nudge-composer.service';
import { SoundService } from '../../core/services/sound.service';
import { EventsPage } from './events-page';
import { CELEBRATION_MS } from './join-celebration/join-celebration';

const feedUrl = (r: { url: string }) => r.url === '/api/circles/feed';
const dto = (id: number) => circleDto({ itineraryId: id, host: { ...circleDto().host, suiteLabel: `Suite ${id}` } });

describe('EventsPage', () => {
  let fixture: ComponentFixture<EventsPage>;
  let controller: HttpTestingController;
  let el: HTMLElement;

  /** Drags the top card like a finger: down, two moves, up. `dx` > 0 is to the right. */
  const drag = (dx: number) => {
    const card = el.querySelector<HTMLElement>('[data-index="0"]')!;
    const Pointer = (globalThis.PointerEvent ?? MouseEvent) as typeof MouseEvent;
    const fire = (type: string, x: number) => {
      const event = new Pointer(type, { clientX: x, clientY: 300, bubbles: true, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      card.dispatchEvent(event);
    };
    fire('pointerdown', 200);
    fire('pointermove', 200 + dx / 2);
    fire('pointermove', 200 + dx);
    fire('pointerup', 200 + dx);
    fixture.detectChanges();
  };
  const swipeRight = () => drag(200);
  const swipeLeft = () => drag(-200);
  const nearYou = () => el.textContent!.match(/(\d+) near you/)?.[1];
  /** Runs the fly-off, the re-render and the frame after it that re-enables swiping. */
  const settle = async () => {
    vi.advanceTimersByTime(400);
    fixture.detectChanges();
    await fixture.whenStable();
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
  };

  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [EventsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    controller = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(EventsPage);
    el = fixture.nativeElement;
    fixture.detectChanges();
    controller.expectOne(feedUrl).flush([dto(1), dto(2), dto(3), dto(4)]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    controller.verify();
    vi.useRealTimers();
  });

  it('celebrates a join, then opens the itinerary once confirmed', async () => {
    expect(nearYou()).toBe('4');
    swipeRight();
    const swipe = controller.expectOne('/api/circles/swipe');
    expect(swipe.request.body).toEqual({ itineraryId: 1, action: 'join' });

    await settle(); // removed before the server answers
    expect(nearYou()).toBe('3');
    expect(el.querySelector('app-join-celebration')?.textContent).toContain('Confirmed with Suite 1');

    // Only one gathering at a time: no further swipes while joining.
    swipeLeft();
    controller.expectNone('/api/circles/swipe');

    swipe.flush({});
    expect(navigate).not.toHaveBeenCalled(); // the celebration plays out first
    vi.advanceTimersByTime(CELEBRATION_MS);
    expect(navigate).toHaveBeenCalledWith(['/itinerary']);
    controller.expectNone(feedUrl); // no refill when leaving
  });

  it('plays the chime on a join, but not on a pass', async () => {
    const chime = vi.spyOn(TestBed.inject(SoundService), 'playJoin').mockImplementation(() => {});
    swipeLeft();
    controller.expectOne('/api/circles/swipe').flush({});
    expect(chime).not.toHaveBeenCalled();
    await settle();

    swipeRight();
    expect(chime).toHaveBeenCalledTimes(1);
    controller.expectOne('/api/circles/swipe').flush({});
  });

  it('puts the card back and explains when a join fails', async () => {
    swipeRight();
    controller.expectOne('/api/circles/swipe').flush(null, { status: 500, statusText: 'Server Error' });
    await settle();
    await settle();

    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('app-join-celebration')).toBeNull();
    expect(el.textContent).toContain('We couldn’t confirm your place');
    expect(nearYou()).toBe('4');

    // The guest can swipe again.
    swipeRight();
    controller.expectOne('/api/circles/swipe').flush({});
  });

  it('joins with a note from the Nudge tab', async () => {
    TestBed.inject(NudgeComposerService).request();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.textContent).toContain('Nudge the host');

    const textarea = el.querySelector<HTMLTextAreaElement>('#nudge-message')!;
    textarea.value = 'Count me in, bringing a bottle of Barolo!';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.includes('Join & send nudge'))!.click();

    const swipe = controller.expectOne('/api/circles/swipe');
    expect(swipe.request.body).toEqual({
      itineraryId: 1,
      action: 'join',
      message: 'Count me in, bringing a bottle of Barolo!',
    });
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Nudge the host');

    swipe.flush({});
    await settle();
    vi.advanceTimersByTime(CELEBRATION_MS);
    expect(navigate).toHaveBeenCalledWith(['/itinerary']);
  });

  it('does not bring back a gathering that filled up (409)', async () => {
    swipeRight();
    controller.expectOne('/api/circles/swipe').flush(null, { status: 409, statusText: 'Conflict' });
    await settle();
    await settle();
    expect(el.textContent).toContain('That gathering just filled up');
    expect(nearYou()).toBe('3');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('only swipes decide: no buttons, arrow keys do nothing, a short drag snaps back', () => {
    expect(el.querySelector('button[aria-label="Join"], button[aria-label="Pass"]')).toBeNull();
    expect(el.textContent).toContain('Swipe left to pass • Swipe right to join');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    drag(20); // below both the swipe threshold and the minimum flick distance
    controller.expectNone('/api/circles/swipe');
    expect(nearYou()).toBe('4');
  });

  it('passes on a left swipe and acknowledges it quietly', async () => {
    swipeLeft();
    const pass = controller.expectOne('/api/circles/swipe');
    expect(pass.request.body).toEqual({ itineraryId: 1, action: 'pass' });
    pass.flush({});
    fixture.detectChanges();
    expect(el.textContent).toContain('Not tonight');
    await settle();
    expect(nearYou()).toBe('3');
    expect(el.querySelector('app-join-celebration')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refills below three cards, appending only unseen ones', async () => {
    swipeLeft();
    controller.expectOne('/api/circles/swipe').flush({});
    await settle();
    swipeLeft();
    controller.expectOne('/api/circles/swipe').flush({});
    await settle(); // 2 left -> refill

    // The server may still return a just-swiped card; it must not come back.
    controller.expectOne(feedUrl).flush([dto(2), dto(3), dto(4), dto(5)]);
    fixture.detectChanges();
    expect(nearYou()).toBe('3');
  });

  it('shows the empty state with a start over link', async () => {
    for (let i = 0; i < 4; i++) {
      swipeLeft();
      controller.expectOne('/api/circles/swipe').flush({});
      await settle();
      controller.match(feedUrl).forEach((req) => req.flush([]));
      fixture.detectChanges();
    }
    expect(el.textContent).toContain('You’ve seen every invitation tonight.');

    el.querySelector<HTMLButtonElement>('button.underline')!.click();
    controller.expectOne('/api/circles/swipes').flush({});
    controller.expectOne(feedUrl).flush([dto(1)]);
    fixture.detectChanges();
    expect(nearYou()).toBe('1');
  });
});
