import { Routes } from '@angular/router';

import { authGuard, loggedOutGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Stay · Sign in',
    canActivate: [loggedOutGuard],
    loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    pathMatch: 'full',
    title: 'Stay · Welcome',
    canActivate: [authGuard],
    loadComponent: () => import('./features/welcome/welcome-page').then((m) => m.WelcomePage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/tab-shell/tab-shell').then((m) => m.TabShell),
    children: [
      {
        path: 'itinerary',
        title: 'Stay · Today',
        data: { section: 'Stay' },
        loadComponent: () =>
          import('./features/itinerary/itinerary-page').then((m) => m.ItineraryPage),
      },
      {
        path: 'events',
        title: 'Stay · Events',
        data: { section: 'Events' },
        loadComponent: () => import('./features/events/events-page').then((m) => m.EventsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
