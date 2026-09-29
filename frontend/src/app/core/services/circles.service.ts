import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CircleCard, CircleCardDto, SwipeAction } from '../models/stay.models';

@Injectable({ providedIn: 'root' })
export class CirclesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/circles`;

  /** Other guests' invitations, best match first; already-swiped ones are excluded. */
  getFeed(limit = 10): Observable<CircleCard[]> {
    return this.http
      .get<CircleCardDto[]>(`${this.baseUrl}/feed`, { params: { limit } })
      .pipe(map((cards) => cards.map((c) => toCircleCard(c))));
  }

  /** Gatherings the guest has joined, in the same card shape. */
  getJoined(): Observable<CircleCard[]> {
    return this.http
      .get<CircleCardDto[]>(`${this.baseUrl}/joined`)
      .pipe(map((cards) => cards.map((c) => toCircleCard(c))));
  }

  swipe(itineraryId: number, action: SwipeAction): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/swipe`, { itineraryId, action });
  }

  /** Demo helper: forgets every swipe so the feed starts over. */
  resetSwipes(): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/swipes`);
  }
}

export function toCircleCard(dto: CircleCardDto, now = new Date()): CircleCard {
  const h = dto.highlight ?? {};
  const spots = dto.spotsRemaining;
  return {
    itineraryId: dto.itineraryId,
    imageUrl: h.imageUrl || dto.posterUrl,
    whenLabel: whenLabel(dto.itineraryDate, h.time, now),
    spotsLabel: `${spots} ${spots === 1 ? 'spot' : 'spots'} remaining`,
    note: h.note || undefined,
    location: h.location ?? '',
    title: h.title || dto.title,
    inviteMessage: dto.inviteMessage,
    host: {
      name: dto.host.name,
      initials: initials(dto.host.name),
      imageUrl: dto.host.profileImage || undefined,
      suiteLabel: dto.host.suiteLabel,
    },
    tags: dto.tags ?? h.tags ?? [],
    matchPercent: Math.round(dto.matchPercent),
    matchBreakdown: (dto.matchBreakdown ?? []).map(({ key, label, percent, detail }) => ({
      key,
      label,
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      detail,
    })),
    matchReasons: dto.matchReasons ?? [],
  };
}

/** "Tonight · 21:00", "Tomorrow · 13:00" or "Mon 5 Oct · 13:00". */
function whenLabel(isoDate: string, time: string | undefined, now: Date): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const hour = Number(time?.split(':')[0]);

  let day: string;
  if (Number.isNaN(diffDays)) day = '';
  else if (diffDays === 0) day = hour >= 17 ? 'Tonight' : 'Today';
  else if (diffDays === 1) day = 'Tomorrow';
  else day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return [day, time].filter(Boolean).join(' · ');
}

function initials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
