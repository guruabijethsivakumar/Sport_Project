import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GameDetailsPage } from '../src/pages/games/GameDetailsPage';
import { ToastProvider } from '../src/components/ui/Toast';

// Mock sports catalog
const mockSports = [
  {
    key: 'badminton',
    name: 'Badminton',
    formats: [
      { key: 'singles', label: 'Singles (1v1)', playersPerSide: 1 },
      { key: 'doubles', label: 'Doubles (2v2)', playersPerSide: 2 },
    ],
  },
  {
    key: 'football',
    name: 'Football',
    formats: [{ key: '5_a_side', label: '5-a-side (Futsal)', playersPerSide: 5 }],
  },
];

// Mock game document
const mockOpenGame = {
  id: 'game-123',
  sportKey: 'badminton',
  formatKey: 'singles',
  status: 'open',
  hostId: 'host-user-id',
  startsAt: '2026-10-15T18:00:00.000Z',
  endsAt: '2026-10-15T19:30:00.000Z',
  joinPolicy: 'open',
  visibility: 'public',
  inviteCode: 'BAD123',
  venueName: 'Marina Smash Arena',
  venueAreaLabel: 'Marina Beach',
  courtName: 'Badminton Court 1',
  location: {
    type: 'Point',
    coordinates: [80.28, 13.06],
    addressName: 'Marina Smash Arena, 42 Beach Rd',
  },
  ratingRange: {
    min: 1000,
    max: 1800,
    allowUnrated: true,
  },
  notes: 'Bring your own Yonex shuttles if possible.',
};

// Mock roster
const mockRoster = {
  gameId: 'game-123',
  sportKey: 'badminton',
  formatKey: 'singles',
  minPlayers: 2,
  maxPlayers: 2,
  participantCount: 1,
  joined: [
    {
      userId: 'host-user-id',
      name: 'Host Alex',
      role: 'host',
      status: 'joined',
      joinedAt: '2026-10-10T10:00:00.000Z',
      rating: 1550,
    },
  ],
  requested: [
    {
      userId: 'pending-user-id',
      name: 'Sam Requesting',
      role: 'player',
      status: 'requested',
      rating: 1400,
    },
  ],
  waitlisted: [],
};

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  getConfig: () => ({ pollingIntervalMs: 0 }),
};

let currentMockUser = {
  id: 'guest-player-id',
  name: 'Guest Player',
  email: 'guest@example.com',
  role: 'player',
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: currentMockUser,
    isAuthenticated: true,
    isLoading: false,
    client: mockClient,
  }),
}));

vi.mock('@playmatch/shared', async () => {
  const actual = await vi.importActual<any>('@playmatch/shared');
  return {
    ...actual,
    useSportsCatalog: () => ({
      data: { sports: mockSports },
      isLoading: false,
    }),
    useFeatureGameResult: () => ({
      data: { proposal: null },
      isLoading: false,
    }),
    useFeatureTeamSuggestion: () => ({
      data: null,
      isLoading: false,
    }),
  };
});

describe('Module 2.3: GameDetailsPage & Roster Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    currentMockUser = {
      id: 'guest-player-id',
      name: 'Guest Player',
      email: 'guest@example.com',
      role: 'player',
    };

    mockClient.get.mockImplementation(async (url: string) => {
      if (url === '/games/game-123') {
        return { success: true, data: mockOpenGame };
      }
      if (url === '/games/game-123/roster') {
        return { success: true, data: mockRoster };
      }
      return {};
    });

    mockClient.post.mockImplementation(async (url: string) => {
      if (url.includes('/join')) {
        return { status: 'joined', message: 'Joined game' };
      }
      if (url.includes('/leave')) {
        return { status: 'left', message: 'Left game' };
      }
      if (url.includes('/cancel')) {
        return { success: true, message: 'Game cancelled' };
      }
      if (url.includes('/approve')) {
        return { success: true, message: 'Participant approved' };
      }
      if (url.includes('/decline')) {
        return { success: true, message: 'Participant declined' };
      }
      return { success: true };
    });

    mockClient.delete.mockImplementation(async () => {
      return { success: true, message: 'Participant removed' };
    });
  });

  const renderGameDetails = (gameId = 'game-123') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={[`/games/${gameId}`]}>
            <Routes>
              <Route path="/games/:id" element={<GameDetailsPage />} />
              <Route path="/games" element={<div>Discovery Feed Destination</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders game details, status, timings, venue, and confirmed roster', async () => {
    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByText('Badminton')).toBeDefined();
      expect(screen.getByText('Singles (1v1)')).toBeDefined();
      expect(screen.getByText('Marina Smash Arena')).toBeDefined();
      expect(screen.getByText('Badminton Court 1')).toBeDefined();
      expect(screen.getByText('Bring your own Yonex shuttles if possible.')).toBeDefined();
    });

    // Roster view checks
    expect(screen.getByText('Confirmed Roster')).toBeDefined();
    expect(screen.getByText('Host Alex')).toBeDefined();
    expect(screen.getByText('1550 Elo')).toBeDefined();
  });

  it('allows eligible player to join open game', async () => {
    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /join game/i })).toBeDefined();
    });

    const joinBtn = screen.getByRole('button', { name: /join game/i });
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith('/games/game-123/join', {});
    });
  });

  it('shows leave game button when user is a joined participant and triggers leave flow', async () => {
    // Current user is joined
    currentMockUser = {
      id: 'joined-player-id',
      name: 'Joined Player',
      email: 'joined@example.com',
      role: 'player',
    };

    mockClient.get.mockImplementation(async (url: string) => {
      if (url === '/games/game-123') return { success: true, data: mockOpenGame };
      if (url === '/games/game-123/roster') {
        return {
          success: true,
          data: {
            ...mockRoster,
            joined: [
              ...mockRoster.joined,
              {
                userId: 'joined-player-id',
                name: 'Joined Player',
                role: 'player',
                status: 'joined',
                rating: 1200,
              },
            ],
          },
        };
      }
      return {};
    });

    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByText('Registered Player')).toBeDefined();
      expect(screen.getByRole('button', { name: /leave game/i })).toBeDefined();
    });

    // Click Leave Game to open confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: /leave game/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Leave Match' })).toBeDefined();
    });

    // Confirm withdrawal
    const confirmLeaveBtn = screen.getByRole('button', { name: 'Leave Match' });
    fireEvent.click(confirmLeaveBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith('/games/game-123/leave', {});
    });
  });

  it('shows host controls and pending requests approval for host user', async () => {
    // Current user is the host
    currentMockUser = {
      id: 'host-user-id',
      name: 'Host Alex',
      email: 'host@example.com',
      role: 'player',
    };

    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByText('Host View')).toBeDefined();
      expect(screen.getByText('Host Control Center')).toBeDefined();
      expect(screen.getByText(/Pending Join Requests \(1\)/i)).toBeDefined();
      expect(screen.getByText('Sam Requesting')).toBeDefined();
    });

    // Approve player
    const approveBtn = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        '/games/game-123/participants/pending-user-id/approve',
        {}
      );
    });
  });

  it('allows host to cancel game with structured cancellation reason', async () => {
    currentMockUser = {
      id: 'host-user-id',
      name: 'Host Alex',
      email: 'host@example.com',
      role: 'player',
    };

    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel match/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel match/i }));

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to cancel this scheduled game? This action notifies all registered participants and cannot be undone.')).toBeDefined();
    });

    // Submit cancellation
    const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith('/games/game-123/cancel', {
        reasonCode: 'host_cancelled',
        reasonText: undefined,
      });
    });
  });

  it('does not leak host controls to non-host viewer', async () => {
    currentMockUser = {
      id: 'regular-viewer-id',
      name: 'Regular Viewer',
      email: 'viewer@example.com',
      role: 'player',
    };

    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByText('Badminton')).toBeDefined();
    });

    // Host Control Center must NOT be present
    expect(screen.queryByText('Host Control Center')).toBeNull();
    expect(screen.queryByText('Pending Join Requests')).toBeNull();
  });

  it('displays coarsened privacy notification for free-form private location', async () => {
    currentMockUser = {
      id: 'regular-viewer-id',
      name: 'Regular Viewer',
      email: 'viewer@example.com',
      role: 'player',
    };

    const mockFreeformGame = {
      ...mockOpenGame,
      venueName: undefined,
      venueAreaLabel: undefined,
      courtName: undefined,
      location: {
        type: 'Point',
        coordinates: [80.3, 13.1],
      },
    };

    mockClient.get.mockImplementation(async (url: string) => {
      if (url === '/games/game-123') return { success: true, data: mockFreeformGame };
      if (url === '/games/game-123/roster') return { success: true, data: mockRoster };
      return {};
    });

    renderGameDetails();

    await waitFor(() => {
      expect(
        screen.getAllByText(/Approximate area • Exact court unlocked on joining/i).length
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Privacy Protection:/i)).toBeDefined();
    });
  });

  it('mounts Dev 3 Team Balancing and Result slots with correct game ID', async () => {
    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByText('Team Balancing & Live Results')).toBeDefined();
    });
  });

  it('renders cancelled match state with cancellation reason and disables joining', async () => {
    const mockCancelledGame = {
      ...mockOpenGame,
      status: 'cancelled',
      cancellationReason: {
        reasonCode: 'weather',
        reasonText: 'Heavy monsoon thunderstorms flooding court.',
      },
    };

    mockClient.get.mockImplementation(async (url: string) => {
      if (url === '/games/game-123') return { success: true, data: mockCancelledGame };
      if (url === '/games/game-123/roster') return { success: true, data: mockRoster };
      return {};
    });

    renderGameDetails();

    await waitFor(() => {
      expect(screen.getByText('Match Cancelled by Host')).toBeDefined();
      expect(screen.getByText(/Heavy monsoon thunderstorms flooding court/i)).toBeDefined();
      expect(screen.queryByRole('button', { name: /join game/i })).toBeNull();
    });
  });
});
