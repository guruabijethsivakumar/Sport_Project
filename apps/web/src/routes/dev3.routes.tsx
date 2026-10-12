import React from 'react';
import type { DomainRouteModule } from './types';
import RecommendationsTab from '../pages/games/RecommendationsTab';

// Dev 3 owns AI Recommendations, Results, Teams, and Notifications routes
export const dev3Routes: DomainRouteModule = [
  {
    path: '/recommendations',
    element: <RecommendationsTab />,
    isProtected: true,
    owner: 'Dev 3',
    nav: {
      label: 'Recommendations',
      order: 15,
      requiresAuth: true,
    },
  },
];
