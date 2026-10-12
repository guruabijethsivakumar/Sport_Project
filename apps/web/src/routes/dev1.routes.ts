import React from 'react';
import type { DomainRouteModule } from './types';
import { LoginPage } from '../pages/auth/LoginPage';
import { ComingSoonPage } from '../pages/auth/ComingSoonPage';

// Dev 1 owns Auth, Profile, and Onboarding routes
export const dev1Routes: DomainRouteModule = [
  {
    path: '/login',
    element: <LoginPage />,
    owner: 'Dev 1',
  },
  {
    path: '/register',
    element: (
      <ComingSoonPage
        title="Registration Coming Soon"
        description="Player registration will open soon. Please check back later or log in with an existing account."
        backTo="/login"
        backLabel="Go to Login"
      />
    ),
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
];
