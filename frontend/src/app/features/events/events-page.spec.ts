import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { circleDto } from '../../core/services/circles.service.spec';
import { NudgeComposerService } from '../../core/services/nudge-composer.service';
import { EventsPage } from './events-page';
import { CELEBRATION_MS } from './join-celebration/join-celebration';

const feedUrl = (r: { url: string }) => r.url === '/api/circles/feed';
const dto = (id: number) => circleDto({ itineraryId: id, host: { ...circleDto().host, suiteLabel: `Suite ${id}` } });

describe('EventsPage', () => {
  let fixture: ComponentFixture<EventsPage>;
  let controller: HttpTestingController;
  let el: HTMLElement;

  const buttons = () => ({
    pass: el.querySelector<HTMLButtonElement>('button[aria-label="Pass"]')!,
    join: el.querySelector<HTMLButtonElement>('button[aria-label="Join"]')!,
  });
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
    buttons().join.click();
    const swipe = controller.expectOne('/api/circles/swipe');
    expect(swipe.request.body).toEqual({ itineraryId: 1, action: 'join' });

    await settle(); // removed before the server answers
    expect(nearYou()).toBe('3');
    expect(el.querySelector('app-join-celebration')?.textContent).toContain('Confirmed with Suite 1');

    // Only one gathering at a time: no further swipes while joining.
    buttons().pass.click();
    controller.expectNone('/api/circles/swipe');

    swipe.flush({});
    expect(navigate).not.toHaveBeenCalled(); // the celebration plays out first
    vi.advanceTimersByTime(CELEBRATION_MS);
    expect(navigate).toHaveBeenCalledWith(['/itinerary']);
    controller.expectNone(feedUrl); // no refill when leaving
  });

  it('puts the card back and explains when a join fails', async () => {
    buttons().join.click();
    controller.expectOne('/api/circles/swipe').flush(null, { status: 500, statusText: 'Server Error' });
    await settle();
    await settle();

    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('app-join-celebration')).toBeNull();
    expect(el.textContent).toContain('We couldn’t confirm your place');
    expect(nearYou()).toBe('4');
    expect(buttons().join.disabled).toBe(false);
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
    buttons().join.click();
    controller.expectOne('/api/circles/swipe').flush(null, { status: 409, statusText: 'Conflict' });
    await settle();
    await settle();
    expect(el.textContent).toContain('That gathering just filled up');
    expect(nearYou()).toBe('3');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('passes with the left arrow key and acknowledges it quietly', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    controller.expectOne('/api/circles/swipe').flush({});
    fixture.detectChanges();
    expect(el.textContent).toContain('Not tonight');
    await settle();
    expect(nearYou()).toBe('3');
    expect(el.querySelector('app-join-celebration')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refills below three cards, appending only unseen ones', async () => {
    buttons().pass.click();
    controller.expectOne('/api/circles/swipe').flush({});
    await settle();
    buttons().pass.click();
    controller.expectOne('/api/circles/swipe').flush({});
    await settle(); // 2 left -> refill

    // The server may still return a just-swiped card; it must not come back.
    controller.expectOne(feedUrl).flush([dto(2), dto(3), dto(4), dto(5)]);
    fixture.detectChanges();
    expect(nearYou()).toBe('3');
  });

  it('shows the empty state with a start over link', async () => {
    for (let i = 0; i < 4; i++) {
      buttons().pass.click();
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
