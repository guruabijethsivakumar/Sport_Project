import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '../src/pages/home/HomePage';
import { AppLayout } from '../src/components/layout/AppLayout';

// Mock AuthContext
let mockAuthState = {
  isAuthenticated: false,
  user: null as any,
  client: {
    get: vi.fn(),
    post: vi.fn(),
    getAdapter: () => ({ getAccessToken: () => null }),
    onLoggedOut: () => () => {},
  },
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

// Partial mock for @playmatch/shared
vi.mock('@playmatch/shared', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    useOnboardingStatus: () => ({
      data: mockAuthState.isAuthenticated
        ? { isComplete: false, missingSteps: ['sports', 'location'] }
        : null,
      isLoading: false,
    }),
    useMyProfile: () => ({
      data: mockAuthState.isAuthenticated
        ? {
            displayName: 'Test Player',
            locationLabel: 'Chennai, Tamil Nadu',
            onboarding: { status: 'in_progress' },
          }
        : null,
      isLoading: false,
    }),
    useNotifications: () => ({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false,
    }),
  };
});

// Mock ThemeContext
vi.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    resolvedTheme: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

describe('HomePage & Layout Reference', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      client: {
        get: vi.fn(),
        post: vi.fn(),
        getAdapter: () => ({ getAccessToken: () => null }),
        onLoggedOut: () => () => {},
      },
      login: vi.fn(),
      logout: vi.fn(),
    };
  });

  it('renders unauthenticated hero landing with call to actions', () => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AppLayout>
            <HomePage />
          </AppLayout>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.getByText(/Create Account/i)).toBeDefined();
    expect(screen.getByText(/Dynamic Leaderboards/i)).toBeDefined();
    expect(screen.getByText(/Smart Recommendations/i)).toBeDefined();

    // Verify /kit is in the footer
    const footerLink = screen.getByRole('link', { name: /UI Kit Showcase/i });
    expect(footerLink).toBeDefined();
    expect(footerLink.getAttribute('href')).toBe('/kit');
  });

  it('renders authenticated dashboard with profile snapshot and quick actions', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      id: 'user-123',
      name: 'Test Player',
      email: 'player@example.com',
      role: 'PLAYER',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AppLayout>
            <HomePage />
          </AppLayout>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Welcome back, Test Player!/i)).toBeDefined();
    expect(screen.getByText(/Onboarding Incomplete/i)).toBeDefined();
    expect(screen.getByText(/Finish setting up your player profile/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Continue Wizard/i })).toBeDefined();

    // Action cards
    expect(screen.getByRole('button', { name: /View Leaderboards/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Explore Matches/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Resume Onboarding/i })).toBeDefined();

    // Profile snapshot
    expect(screen.getByText('player@example.com')).toBeDefined();
    expect(screen.getByText('Chennai, Tamil Nadu')).toBeDefined();
  });
});
