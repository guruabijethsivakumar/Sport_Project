import React from 'react';
import type { DomainRouteModule } from './types';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ComingSoonPage } from '../pages/auth/ComingSoonPage';
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage';

// Dev 1 owns Auth, Profile, Onboarding, and Leaderboard reference screens
export const dev1Routes: DomainRouteModule = [
  {
    path: '/login',
    element: <LoginPage />,
    owner: 'Dev 1',
  },
  {
    path: '/register',
    element: <RegisterPage />,
    owner: 'Dev 1',
  },
  {
    path: '/forgot-password',
    element: (
      <ComingSoonPage
        title="Password Reset Coming Soon"
        description="Self-service password reset is coming soon. Please contact an administrator for assistance."
        backTo="/login"
        backLabel="Return to Sign in"
      />
    ),
    owner: 'Dev 1',
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
    owner: 'Dev 1',
    nav: {
      label: 'Leaderboard',
      order: 20,
    },
  },
];
