import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from '../src/pages/profile/ProfilePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock AuthContext
const mockAuthState = {
  user: {
    id: 'usr-123',
    name: 'Alex Morgan',
    email: 'alex@example.com',
    role: 'player',
    status: 'active',
  },
  isAuthenticated: true,
  isLoading: false,
  client: {
    get: vi.fn(),
    post: vi.fn(),
  },
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

// Mock shared hooks
vi.mock('@playmatch/shared', async () => {
  const actual = await vi.importActual<any>('@playmatch/shared');
  return {
    ...actual,
    useMyProfile: () => ({
      data: {
        profile: {
          displayName: 'Alex Morgan',
          bio: 'Competitive badminton player looking for local weekend tournaments.',
          locationLabel: 'Chennai, Tamil Nadu',
          travelRadiusKm: 20,
          timezone: 'Asia/Kolkata',
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useMyRatings: () => ({
      data: {
        ratings: [
          {
            sportKey: 'badminton',
            sportName: 'Badminton',
            rating: 1450.5,
            peakRating: 1480,
            band: { key: 'advanced', label: 'Advanced' },
            wins: 14,
            losses: 4,
            draws: 0,
            gamesPlayed: 18,
          },
          {
            sportKey: 'football',
            sportName: 'Football',
            rating: 1200,
            peakRating: 1200,
            band: { key: 'intermediate', label: 'Intermediate' },
            wins: 5,
            losses: 5,
            draws: 1,
            gamesPlayed: 11,
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useRatingHistory: () => ({
      data: {
        events: [
          {
            id: 'evt-1',
            createdAt: '2026-10-10T10:00:00Z',
            oldRating: 1410,
            newRating: 1450.5,
            delta: 40.5,
            outcomeScore: 1,
            bandBefore: { key: 'intermediate', label: 'Intermediate' },
            bandAfter: { key: 'advanced', label: 'Advanced' },
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useMyReliability: () => ({
      data: {
        reliability: {
          score: 96,
          tier: 'gold',
          gamesCounted: 15,
          onTimeLeaves: 1,
          lateLeaves: 0,
          noShows: 0,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

describe('ProfilePage Screen (Developer 1)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/profile?sport=badminton']}>
          <ProfilePage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders player profile info and reliability badge', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Player Profile' })).toBeDefined();
    expect(screen.getByText('Alex Morgan')).toBeDefined();
    expect(screen.getByText(/Competitive badminton player/)).toBeDefined();
    expect(screen.getByText(/gold Member/i)).toBeDefined();
    expect(screen.getByText('96')).toBeDefined();
  });

  it('renders sports Elo breakdown cards with ratings and records', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Sports Elo Breakdown' })).toBeDefined();
    expect(screen.getAllByText('1450.5').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Peak Rating:/i).length).toBeGreaterThan(0);
    expect(screen.getByText('1480')).toBeDefined();
  });

  it('renders match history and rating progression table', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Match & Rating Progression History' })).toBeDefined();
    expect(screen.getByText('Victory')).toBeDefined();
    expect(screen.getByText('+40.5')).toBeDefined();
  });
});
