import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GamesDiscoveryPage } from '../src/pages/games/GamesDiscoveryPage';
import { GameCard } from '../src/components/games/GameCard';

// Polyfill ResizeObserver for Radix UI slider in jsdom
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

const mockSports = [
  {
    key: 'badminton',
    name: 'Badminton',
    formats: [
      { key: 'singles', label: 'Singles (1v1)' },
      { key: 'doubles', label: 'Doubles (2v2)' },
    ],
  },
  {
    key: 'cricket',
    name: 'Cricket',
    formats: [{ key: '6_a_side', label: '6-a-side' }],
  },
];

const mockDiscoveryGames = [
  {
    game: {
      _id: 'game-1',
      sportKey: 'badminton',
      formatKey: 'singles',
      status: 'open',
      joinPolicy: 'open',
      minPlayers: 2,
      maxPlayers: 2,
      participantCount: 1,
      startsAt: '2026-10-15T10:00:00.000Z',
      notes: 'Weekend Singles Practice',
      venueName: 'Marina Smash Arena',
      venueAreaLabel: 'Marina Beach',
      courtName: 'Court 1',
      location: {
        type: 'Point',
        coordinates: [80.28, 13.06],
        addressName: 'Marina Smash Arena, Marina Beach',
      },
    },
    distanceKm: 2.5,
    matchSignals: {
      distanceKm: 2.5,
      seatsLeft: 1,
      ratingInRange: true,
      availabilityFit: true,
    },
  },
  {
    game: {
      _id: 'game-2',
      sportKey: 'cricket',
      formatKey: '6_a_side',
      status: 'full',
      joinPolicy: 'approval',
      minPlayers: 6,
      maxPlayers: 12,
      participantCount: 12,
      waitlistCount: 2,
      startsAt: '2026-10-16T15:00:00.000Z',
      notes: 'Competitive Turf League',
      venueName: 'Chepauk Turf Grounds',
      location: {
        type: 'Point',
        coordinates: [80.25, 13.05],
      },
    },
    distanceKm: 5.0,
    matchSignals: {
      distanceKm: 5.0,
      seatsLeft: 0,
      ratingInRange: false,
      availabilityFit: false,
    },
  },
];

// Mock AuthContext
const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'mock-user-id',
      name: 'Player One',
      email: 'player@example.com',
      role: 'player',
    },
    isAuthenticated: true,
    isLoading: false,
    client: mockClient,
  }),
}));

// Mock shared sports catalog hook
vi.mock('@playmatch/shared', async () => {
  const actual = await vi.importActual<any>('@playmatch/shared');
  return {
    ...actual,
    useSportsCatalog: () => ({
      data: { sports: mockSports },
      isLoading: false,
    }),
  };
});

describe('GameCard Component', () => {
  it('renders sport, format, venue name, and spots left', () => {
    render(
      <MemoryRouter>
        <GameCard
          game={mockDiscoveryGames[0].game as any}
          distanceKm={mockDiscoveryGames[0].distanceKm}
          matchSignals={mockDiscoveryGames[0].matchSignals as any}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Badminton')).toBeDefined();
    expect(screen.getByText('Singles')).toBeDefined();
    expect(screen.getByText('Open')).toBeDefined();
    expect(screen.getByText('Marina Smash Arena')).toBeDefined();
    expect(screen.getByText('(2.5 km away)')).toBeDefined();
    expect(screen.getByText('Weekend Singles Practice')).toBeDefined();
    expect(screen.getByText(/1 \/ 2 players/)).toBeDefined();
    expect(screen.getByText('(1 open)')).toBeDefined();

    const link = screen.getByRole('link', { name: /view game/i });
    expect(link.getAttribute('href')).toBe('/games/game-1');
  });

  it('renders full status badge and waitlist count when full', () => {
    render(
      <MemoryRouter>
        <GameCard
          game={mockDiscoveryGames[1].game as any}
          distanceKm={mockDiscoveryGames[1].distanceKm}
          matchSignals={mockDiscoveryGames[1].matchSignals as any}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Cricket')).toBeDefined();
    expect(screen.getByText('Full / Waitlist')).toBeDefined();
    expect(screen.getByText('Request to join')).toBeDefined();
    expect(screen.getByText(/12 \/ 12 players/)).toBeDefined();
    expect(screen.getByText('(Full)')).toBeDefined();
    expect(screen.getByText(/2 waitlisted/)).toBeDefined();
  });
});

describe('GamesDiscoveryPage Feed & Filters', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    mockClient.get.mockImplementation(async (url: string) => {
      if (url.startsWith('/games/discover')) {
        return {
          items: mockDiscoveryGames,
          pagination: { hasMore: false, totalReturned: 2 },
        };
      }
      return {};
    });
  });

  const renderDiscoveryPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/games']}>
          <Routes>
            <Route path="/games" element={<GamesDiscoveryPage />} />
            <Route path="/games/:id" element={<div>Game Detail Destination</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders discovery page heading, filters, and game cards', async () => {
    renderDiscoveryPage();

    expect(screen.getByText('Discover Games')).toBeDefined();
    expect(
      screen.getByText(/Find and join upcoming matches, pickup sessions/i)
    ).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('2 games available')).toBeDefined();
      expect(screen.getByText('Weekend Singles Practice')).toBeDefined();
      expect(screen.getByText('Competitive Turf League')).toBeDefined();
    });
  });

  it('filters games based on keyword search query', async () => {
    renderDiscoveryPage();

    await waitFor(() => {
      expect(screen.getByText('Weekend Singles Practice')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/search by venue or notes/i);
    fireEvent.change(searchInput, { target: { value: 'Turf' } });

    await waitFor(() => {
      expect(screen.queryByText('Weekend Singles Practice')).toBeNull();
      expect(screen.getByText('Competitive Turf League')).toBeDefined();
      expect(screen.getByText('1 games available')).toBeDefined();
    });
  });

  it('displays empty state when no games match search query', async () => {
    renderDiscoveryPage();

    await waitFor(() => {
      expect(screen.getByText('Weekend Singles Practice')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/search by venue or notes/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent game query' } });

    await waitFor(() => {
      expect(screen.getByText('No games found')).toBeDefined();
      expect(screen.getByText('Clear Filters')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Clear Filters'));

    await waitFor(() => {
      expect(screen.getByText('Weekend Singles Practice')).toBeDefined();
      expect(screen.getByText('2 games available')).toBeDefined();
    });
  });

  it('displays error state when backend discovery query fails', async () => {
    mockClient.get.mockImplementation(async (url: string) => {
      if (url.startsWith('/games/discover')) {
        throw new Error('Connection failed to discovery service');
      }
      return {};
    });

    renderDiscoveryPage();

    await waitFor(() => {
      expect(screen.getByText('Unable to load games')).toBeDefined();
      expect(screen.getByText('Connection failed to discovery service')).toBeDefined();
      expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
    });
  });
});
