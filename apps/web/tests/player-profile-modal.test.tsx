import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlayerProfileModal } from '../src/components/profile/PlayerProfileModal';

const mockClient = {
  get: vi.fn(),
  getConfig: () => ({ pollingIntervalMs: 0 }),
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'viewer-1' },
    isAuthenticated: true,
    client: mockClient,
  }),
}));

describe('Public Player Profile Modal Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.clearAllMocks();
  });

  it('renders public player profile details and calibrated ratings', async () => {
    mockClient.get.mockImplementation(async (url: string) => {
      if (url.includes('/profiles/player-42')) {
        return {
          id: 'player-42',
          displayName: 'Vikram Tennis',
          bio: 'Competitive weekend player',
          location: { label: 'Adyar, Chennai' },
          sports: [
            {
              sport: { name: 'Tennis', key: 'tennis' },
              bandLabel: 'Calibrated',
              rating: 1450,
            },
          ],
        };
      }
      if (url.includes('/reliability/player-42')) {
        return {
          userId: 'player-42',
          reliability: {
            score: 95,
            tier: 'gold',
            gamesCounted: 18,
            noShows: 0,
          },
        };
      }
      return {};
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PlayerProfileModal userId="player-42" isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Vikram Tennis')).toBeDefined();
      expect(screen.getByText('Competitive weekend player')).toBeDefined();
      expect(screen.getByText('Tennis')).toBeDefined();
      expect(screen.getByText(/1450/)).toBeDefined();
      expect(screen.getByText(/Member/i)).toBeDefined();
    });
  });

  it('handles private player profile with clean privacy message', async () => {
    mockClient.get.mockImplementation(async (url: string) => {
      if (url.includes('/profiles/private-user')) {
        const err: any = new Error('This profile is private');
        err.statusCode = 403;
        err.code = 'PROFILE_PRIVATE';
        throw err;
      }
      return {};
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PlayerProfileModal userId="private-user" isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Private Profile')).toBeDefined();
      expect(screen.getByText(/This player has set their profile visibility to private/i)).toBeDefined();
    });
  });
});
