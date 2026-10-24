import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InviteCodeModal } from '../src/components/games/InviteCodeModal';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  getConfig: () => ({ pollingIntervalMs: 0 }),
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Player' },
    isAuthenticated: true,
    client: mockClient,
  }),
}));

describe('Join by Match Invite Code Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.clearAllMocks();
  });

  it('looks up match preview by invite code and allows navigation to game details', async () => {
    mockClient.get.mockResolvedValueOnce({
      success: true,
      data: {
        id: 'game-private-99',
        sportKey: 'badminton',
        formatKey: 'singles',
        startsAt: '2026-10-20T18:00:00.000Z',
        venueName: 'Private Arena',
        maxPlayers: 2,
        currentPlayersCount: 1,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InviteCodeModal isOpen={true} onClose={vi.fn()} initialCode="PRIV1234" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/badminton/i)).toBeDefined();
      expect(screen.getByText('Private Arena')).toBeDefined();
    });

    const viewBtn = screen.getByRole('button', { name: /View & Join Match/i });
    fireEvent.click(viewBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/games/game-private-99?code=PRIV1234');
  });

  it('displays not found message when invite code does not exist', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('Match not found for this invite code.'));

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InviteCodeModal isOpen={true} onClose={vi.fn()} initialCode="UNKNOWN1" />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Game Not Found')).toBeDefined();
    });
  });
});
