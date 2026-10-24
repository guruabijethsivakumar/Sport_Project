import React from 'react';
import type { DomainRouteModule } from './types';
import { GamesDiscoveryPage } from '../pages/games/GamesDiscoveryPage';
import { CreateGamePage } from '../pages/games/CreateGamePage';
import { GameDetailsPage } from '../pages/games/GameDetailsPage';
import { VenueManagementPage } from '../pages/venues/VenueManagementPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';

// Dev 2 owns Games, Venues, and Admin routes
export const dev2Routes: DomainRouteModule = [
  {
    path: '/games',
    element: <GamesDiscoveryPage />,
    isProtected: true,
    owner: 'Dev 2',
    nav: {
      label: 'Games',
      order: 12,
      requiresAuth: true,
    },
  },
  {
    path: '/games/new',
    element: <CreateGamePage />,
    isProtected: true,
    owner: 'Dev 2',
  },
  {
    path: '/my-games',
    element: <GamesDiscoveryPage />,
    isProtected: true,
    owner: 'Dev 2',
  },
  {
    path: '/games/mine',
    element: <GamesDiscoveryPage />,
    isProtected: true,
    owner: 'Dev 2',
  },
  {
    path: '/games/join/:code',
    element: <GamesDiscoveryPage />,
    isProtected: true,
    owner: 'Dev 2',
  },
  {
    path: '/games/:id',
    element: <GameDetailsPage />,
    isProtected: true,
    owner: 'Dev 2',
  },

  {
    path: '/venues/manage',
    element: <VenueManagementPage />,
    isProtected: true,
    owner: 'Dev 2',
    nav: {
      label: 'Venues',
      order: 14,
      requiresAuth: true,
      roles: ['venue_owner', 'admin'],
    },
  },
  {
    path: '/dashboard',
    element: <AdminDashboardPage />,
    isProtected: true,
    owner: 'Dev 2',
  },
  {
    path: '/admin',
    element: <AdminDashboardPage />,
    isProtected: true,
    owner: 'Dev 2',
  },
];


