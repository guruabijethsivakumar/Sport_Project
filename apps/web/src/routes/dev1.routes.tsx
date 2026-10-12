import React from 'react';
import type { DomainRouteModule } from './types';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
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
    path: '/onboarding',
    element: <OnboardingPage />,
    owner: 'Dev 1',
    isProtected: true,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
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
