import React from 'react';
import type { DomainRouteModule } from './types';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { OnboardingPage } from '../pages/onboarding/OnboardingPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage';
import { ProfilePage } from '../pages/profile/ProfilePage';

// Dev 1 owns Auth, Profile, Onboarding, and Leaderboard reference screens
export const dev1Routes: DomainRouteModule = [
  {
    path: '/login',
    element: <LoginPage />,
    isProtected: false,
    owner: 'Dev 1',
  },
  {
    path: '/register',
    element: <RegisterPage />,
    isProtected: false,
    owner: 'Dev 1',
  },
  {
    path: '/onboarding',
    element: <OnboardingPage />,
    isProtected: true,
    owner: 'Dev 1',
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
    isProtected: false,
    owner: 'Dev 1',
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
    isProtected: false,
    owner: 'Dev 1',
  },
  {
    path: '/profile',
    element: <ProfilePage />,
    isProtected: true,
    owner: 'Dev 1',
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
    isProtected: true,
    owner: 'Dev 1',
    nav: {
      label: 'Leaderboard',
      order: 20,
      requiresAuth: true,
    },
  },
];
