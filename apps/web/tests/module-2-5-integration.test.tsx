import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../src/components/ui/Toast';
import { allDomainRoutes, renderRoute } from '../src/routes/registry';
import { GameTeamsSlot } from '../src/components/slots/GameTeamsSlot';
import { GameResultSlot } from '../src/components/slots/GameResultSlot';
import { NavbarNotificationSlot } from '../src/components/slots/NavbarNotificationSlot';
import { Navbar } from '../src/components/layout/Navbar';
import RecommendationsTab from '../src/pages/games/RecommendationsTab';
import { DecisionExplanationModal } from '../src/components/explain/DecisionExplanationModal';

// Polyfill ResizeObserver for Radix UI slider in jsdom
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Mock AuthContext
const mockAuthState = {
  user: {
    id: 'user-player-1',
    name: 'Alice Smashing',
    email: 'alice@playmatch.dev',
    role: 'venue_owner',
    homeLocation: { coordinates: [80.28, 13.06] },
  },
  isAuthenticated: true,
  isLoading: false,
  logout: vi.fn(),
  client: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getConfig: () => ({
      features: {
        notificationsMode: 'mock',
        teamsMode: 'mock',
        resultsMode: 'mock',
        recommendationsMode: 'live',
        reliabilityMode: 'mock',
      },
    }),
    getAdapter: () => ({
      getAccessToken: () => Promise.resolve('mock-access-token-xyz'),
    }),
  },
};

vi.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    resolvedTheme: 'dark',
    toggleTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

// Mock socket client
vi.mock('@playmatch/shared', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    PlayMatchSocket: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    })),
  };
});

describe('Module 2.5: System Integration & Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    mockAuthState.isAuthenticated = true;
    mockAuthState.isLoading = false;
    mockAuthState.user = {
      id: 'user-player-1',
      name: 'Alice Smashing',
      email: 'alice@playmatch.dev',
      role: 'venue_owner',
      homeLocation: { coordinates: [80.28, 13.06] },
    };

    mockAuthState.client.get.mockImplementation(async (url: string) => {
      if (url.includes('/sports')) {
        return {
          sports: [
            {
              key: 'badminton',
              name: 'Badminton',
              formats: [{ key: 'singles', label: 'Singles (1v1)', playersPerSide: 1 }],
            },
          ],
        };
      }
      if (url.includes('/discover') || url.startsWith('/games/discover')) {
        return {
          items: [
            {
              game: {
                id: 'game-101',
                sportKey: 'badminton',
                formatKey: 'singles',
                status: 'open',
                startsAt: '2026-10-15T18:00:00.000Z',
                endsAt: '2026-10-15T19:00:00.000Z',
                venueName: 'Smash Arena',
                confirmedCount: 1,
                maxParticipants: 2,
              },
              distanceKm: 2.5,
              matchSignals: { eloCompatibility: 'balanced' },
            },
          ],
          pagination: { hasMore: false, totalReturned: 1 },
        };
      }
      if (url.startsWith('/venues?')) {
        return {
          items: [
            {
              venue: {
                id: 'venue-101',
                name: 'Marina Smash Arena',
                courts: [{ courtId: 'c1', name: 'Court 1', isActive: true, sportKeys: ['badminton'] }],
              },
            },
          ],
        };
      }
      if (url.includes('/recommendations')) {
        return {
          items: [
            {
              gameId: 'rec-game-1',
              title: 'High Elo Badminton Doubles',
              sportKey: 'badminton',
              score: 0.94,
              confidence: 'high',
              factors: [
                { name: 'Skill Match', value: 0.95, weight: 1.5, description: 'Matched Elo' },
                { name: 'Distance', value: 0.9, weight: 1.0, description: '2.1 km away' },
              ],
              reasons: ['Optimal skill alignment', 'Fast commute'],
            },
          ],
        };
      }
      if (url.includes('/notifications')) {
        return {
          notifications: [
            {
              id: 'notif-1',
              title: 'Match Confirmed',
              message: 'Your slot in Badminton singles is locked.',
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
          unreadCount: 1,
        };
      }
      if (url === '/venues/mine') {
        return {
          success: true,
          venues: [
            {
              id: 'venue-101',
              name: 'Marina Smash Arena',
              status: 'active',
              courts: [{ courtId: 'c1', name: 'Court 1', isActive: true, sportKeys: ['badminton'] }],
            },
          ],
        };
      }
      if (url.includes('/availability')) {
        return { success: true, data: [] };
      }
      return { success: true, data: [] };
    });
  });

  const renderAppAtRoute = (route: string) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <Navbar />
            <Routes>
              {allDomainRoutes.map((r) => renderRoute(r))}
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('routes correctly: /games/new opens creation wizard without being captured by /games/:id', async () => {
    renderAppAtRoute('/games/new');

    await waitFor(() => {
      // CreateGamePage Step 1 header
      expect(screen.getByText('Schedule a New Game')).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Select Sport & Format' })).toBeDefined();
    });
  });

  it('routes correctly: /games opens game discovery feed', async () => {
    renderAppAtRoute('/games');

    await waitFor(() => {
      expect(screen.getByText('Discover Games')).toBeDefined();
      expect(screen.getByText('Smash Arena')).toBeDefined();
    });
  });

  it('routes correctly: /venues/manage opens venue management for venue_owner', async () => {
    renderAppAtRoute('/venues/manage');

    await waitFor(() => {
      expect(screen.getByText('Venue Management')).toBeDefined();
      expect(screen.getByText('Marina Smash Arena')).toBeDefined();
    });
  });

  it('integrates NavbarNotificationSlot: mounts notification bell and opens notification drawer', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <NavbarNotificationSlot />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      expect(bellBtn).toBeDefined();
    });

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeDefined();
      expect(screen.getByText(/Game Confirmed!|Match Confirmed/i)).toBeDefined();
    });
  });

  it('integrates GameTeamsSlot: renders team balancing interface for match host', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <GameTeamsSlot gameId="game-101" viewerRole="host" />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Balanced Team Rosters')).toBeDefined();
      expect(screen.getByText(/Regenerate Balanced Teams/i)).toBeDefined();
    });
  });

  it('integrates GameResultSlot: displays verification and dispute controls for match results', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <GameResultSlot gameId="game-101" viewerRole="host" />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Confirm & Verify')).toBeDefined();
      expect(screen.getByText('Dispute')).toBeDefined();
    });
  });

  it('integrates DecisionExplanationModal directly: renders formula factors and explainability breakdown', async () => {
    render(
      <DecisionExplanationModal
        isOpen={true}
        onClose={() => {}}
        mode="game"
        gameData={{
          gameTitle: 'High Elo Badminton Doubles',
          sportKey: 'badminton',
          matchScore: 0.94,
          confidence: 'high',
          factors: [
            { name: 'Skill Match', value: 0.95, weight: 1.5, description: 'Matched Elo' },
          ],
          reasons: ['Optimal skill alignment'],
        }}
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Decision Explainability')).toBeDefined();
    expect(screen.getByText('Why This Game?')).toBeDefined();
    expect(screen.getByText('High Elo Badminton Doubles')).toBeDefined();
    expect(screen.getByText('Skill Match')).toBeDefined();
  });

  it('enforces authentication: redirects guest to /login when visiting protected route', async () => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null as any;

    renderAppAtRoute('/games');

    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeDefined();
      expect(screen.getByLabelText(/email address/i)).toBeDefined();
    });
  });
});
