import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ItineraryDto } from '../../core/models/stay.models';
import { ItineraryPage } from './itinerary-page';

const ITINERARY: ItineraryDto = {
  id: 5,
  guestId: 5,
  title: 'Family Days by the Water',
  tagline: 'Room to breathe.',
  suiteLabel: 'Suite 804',
  itineraryDate: '2026-10-05',
  posterUrl: 'https://example.com/poster.jpg',
  items: [
    { time: '09:00', title: 'Breakfast', status: 'confirmed', statusLabel: 'Confirmed', location: 'Café', description: 'Buffet.' },
  ],
  createdAt: '',
  updatedAt: '',
};

describe('ItineraryPage', () => {
  let fixture: ComponentFixture<ItineraryPage>;
  let controller: HttpTestingController;

  const render = (respond: (req: ReturnType<HttpTestingController['expectOne']>) => void) => {
    respond(controller.expectOne('/api/Itinerary'));
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent!;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ItineraryPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    controller = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ItineraryPage);
    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('invites the guest to plan when they have no itinerary yet (404)', () => {
    const text = render((req) => req.flush({ message: 'No itinerary found for guest 20' }, { status: 404, statusText: 'Not Found' }));
    expect(text).toContain('Nothing planned just yet');
    expect(text).toContain('Compose my stay');
    expect(text).toContain('Browse tonight’s invitations');
    expect(text).not.toContain('couldn’t load');
  });

  it('treats an itinerary without items as nothing planned', () => {
    expect(render((req) => req.flush({ ...ITINERARY, items: [] }))).toContain('Nothing planned just yet');
  });

  it('keeps the connection error for real failures', () => {
    const text = render((req) => req.flush(null, { status: 500, statusText: 'Server Error' }));
    expect(text).toContain('We couldn’t load your itinerary');
    expect(text).not.toContain('Nothing planned just yet');
  });

  it('shows the itinerary when there is one', () => {
    const text = render((req) => req.flush(ITINERARY));
    expect(text).toContain('Family Days by the Water');
    expect(text).toContain('Breakfast');
  });
});
