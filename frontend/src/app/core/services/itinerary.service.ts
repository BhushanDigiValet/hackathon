import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ItineraryDay, ItineraryDto } from '../models/stay.models';

@Injectable({ providedIn: 'root' })
export class ItineraryService {
  private readonly http = inject(HttpClient);

  getItinerary(): Observable<ItineraryDay> {
    return this.http
      .get<ItineraryDto>(`${environment.apiBaseUrl}/Itinerary`)
      .pipe(map((dto) => toItineraryDay(dto)));
  }
}

export function toItineraryDay(dto: ItineraryDto, today = new Date()): ItineraryDay {
  const day = relativeDay(dto.itineraryDate, today);
  return {
    badge: `${day.short} · ${dto.suiteLabel}`,
    coverImageUrl: dto.posterUrl,
    videoUrl: dto.videoUrl || undefined,
    coverEyebrow: 'Cinematic Preview',
    coverTitle: dto.title,
    heading: day.heading,
    quote: `“${dto.tagline}”`,
    hostResponseLabel: 'Your private host responds in ~2m',
    items: dto.items.map((item, i) => ({
      id: `${i}-${item.time}`,
      time: item.time,
      meta: [item.location, item.durationLabel].filter(Boolean).join(' · '),
      confirmed: item.status === 'confirmed',
      statusLabel: item.statusLabel,
      title: item.title,
      description: item.description,
      reason: item.note,
      image: item.imageUrl
        ? { url: item.imageUrl, alt: item.title, caption: item.imageCaption }
        : undefined,
      footer:
        item.footerText || item.actionLabel
          ? { label: item.footerText, actionLabel: item.actionLabel }
          : undefined,
    })),
  };
}

/** Labels for the itinerary date relative to today, e.g. "Today's Flow" or "Mon 5 Oct". */
function relativeDay(isoDate: string, today: Date): { short: string; heading: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((date.getTime() - start.getTime()) / 86_400_000);

  if (Number.isNaN(diffDays)) return { short: 'Your Flow', heading: 'Your Curated Journey' };
  if (diffDays === 0) return { short: "Today's Flow", heading: "Today's Curated Journey" };
  if (diffDays === 1) return { short: "Tomorrow's Flow", heading: "Tomorrow's Curated Journey" };

  const short = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const long = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return { short, heading: `Curated Journey · ${long}` };
}
