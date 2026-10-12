import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
            profile: {
              displayName: 'Test Player',
              locationLabel: 'Chennai, Tamil Nadu',
              travelRadiusKm: 20,
              onboarding: { status: 'in_progress' },
            },
            sports: [
              {
                sportKey: 'badminton',
                skillBand: 'intermediate',
              },
            ],
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

describe('HomePage & Layout Wireframe Alignment', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
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

  it('renders guest landing with hero, exact buttons, and no feature links', () => {
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

    // Hero title & buttons
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Create account$/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^Sign in$/i })).toBeDefined();

    // Guest navbar has only logo and Log in
    const loginButtons = screen.getAllByRole('button', { name: /Log in/i });
    expect(loginButtons.length).toBeGreaterThanOrEqual(1);

    // Three feature highlights present as static text
    expect(screen.getByText(/Dynamic Leaderboards/i)).toBeDefined();
    expect(screen.getByText(/Smart Recommendations/i)).toBeDefined();
    expect(screen.getByText(/Calibrated Skill Bands/i)).toBeDefined();

    // No feature links in guest highlights
    expect(screen.queryByText(/Explore Rankings/i)).toBeNull();
    expect(screen.queryByText(/Sign in to View/i)).toBeNull();
    expect(screen.queryByText(/Get Started/i)).toBeNull();
  });

  it('renders authenticated dashboard with welcome header, incomplete banner, quick actions, and profile snapshot', () => {
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

    // Welcome header
    expect(screen.getByText(/Welcome, Test Player/i)).toBeDefined();

    // Incomplete banner: "Finish your profile: N steps left"
    expect(screen.getByText(/Finish your profile: 2 steps left/i)).toBeDefined();

    // Quick action cards: Leaderboard and Recommendations only
    expect(screen.getByRole('button', { name: /View Leaderboard/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /View Recommendations/i })).toBeDefined();
    // UI Kit or Onboarding should not be quick-action cards
    expect(screen.queryByRole('button', { name: /Open UI Kit Showcase/i })).toBeNull();

    // Profile snapshot fields: sport, skill band, location label, travel radius
    expect(screen.getByText('badminton')).toBeDefined();
    expect(screen.getByText('intermediate')).toBeDefined();
    expect(screen.getByText('Chennai, Tamil Nadu')).toBeDefined();
    expect(screen.getByText('20 km')).toBeDefined();

    // Authenticated Navbar links within header: Home, Recommendations, Leaderboard
    const header = screen.getByRole('banner');
    expect(header).toBeDefined();
    expect(screen.getAllByRole('link', { name: /^Home$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /^Recommendations$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /^Leaderboard$/i }).length).toBeGreaterThanOrEqual(1);
  });
});
