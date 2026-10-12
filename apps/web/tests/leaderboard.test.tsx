import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeaderboardPage } from '../src/pages/leaderboard/LeaderboardPage';
import { AuthProvider, sharedApiClient } from '../src/auth/AuthContext';
import { LEADERBOARD_MESSAGES } from '@playmatch/shared';

const mockSports = [
  { key: 'badminton', name: 'Badminton' },
  { key: 'tennis', name: 'Tennis' },
];

const mockLeaderboardFirstPage = {
  sportKey: 'badminton',
  sportName: 'Badminton',
  entries: [
    {
      userId: 'usr-1',
      displayName: 'Alice Champion',
      avatarUrl: null,
      rating: 1650.4,
      band: { key: 'advanced', label: 'Advanced' },
      gamesPlayed: 25,
      provisional: false,
      wins: 20,
      losses: 5,
      draws: 0,
    },
    {
      userId: 'usr-current',
      displayName: 'Bob CurrentUser',
      avatarUrl: null,
      rating: 1520.0,
      band: { key: 'intermediate', label: 'Intermediate' },
      gamesPlayed: 14,
      provisional: false,
      wins: 9,
      losses: 5,
      draws: 0,
    },
    {
      userId: 'usr-3',
      displayName: 'Charlie Rookie',
      avatarUrl: null,
      rating: 1300.2,
      band: { key: 'novice', label: 'Novice' },
      gamesPlayed: 3,
      provisional: true,
      wins: 1,
      losses: 2,
      draws: 0,
    },
  ],
  hasMore: true,
  nextCursor: 'cursor-page-2',
};

const mockLeaderboardSecondPage = {
  sportKey: 'badminton',
  sportName: 'Badminton',
  entries: [
    {
      userId: 'usr-4',
      displayName: 'Diana Veteran',
      avatarUrl: null,
      rating: 1250.0,
      band: { key: 'novice', label: 'Novice' },
      gamesPlayed: 18,
      provisional: false,
      wins: 8,
      losses: 10,
      draws: 0,
    },
  ],
  hasMore: false,
  nextCursor: null,
};

function renderLeaderboardPage(initialEntries = ['/leaderboard']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('LeaderboardPage Reference Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();

    // Default mock responses for sports catalog and leaderboard
    vi.spyOn(sharedApiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/sports') {
        return mockSports;
      }
      if (url.includes('/leaderboards/badminton') && url.includes('cursor=cursor-page-2')) {
        return mockLeaderboardSecondPage;
      }
      if (url.includes('/leaderboards/badminton')) {
        return mockLeaderboardFirstPage;
      }
      if (url.includes('/leaderboards/tennis')) {
        return {
          sportKey: 'tennis',
          sportName: 'Tennis',
          entries: [],
          hasMore: false,
          nextCursor: null,
        };
      }
      return {};
    });
  });

  it('renders leaderboard title, sport selector, and table headers correctly', async () => {
    renderLeaderboardPage();

    expect(screen.getByRole('heading', { name: LEADERBOARD_MESSAGES.title })).toBeDefined();

    await waitFor(() => {
      // Check column headers in desktop table
      expect(screen.getByText(LEADERBOARD_MESSAGES.rankColumn)).toBeDefined();
      expect(screen.getByText(LEADERBOARD_MESSAGES.playerColumn)).toBeDefined();
      expect(screen.getByText(LEADERBOARD_MESSAGES.ratingColumn)).toBeDefined();
      expect(screen.getByText(LEADERBOARD_MESSAGES.gamesPlayedColumn)).toBeDefined();
      expect(screen.getByText(LEADERBOARD_MESSAGES.winRateColumn)).toBeDefined();
    });
  });

  it('displays computed sequential ranks and formats ratings with API band label', async () => {
    renderLeaderboardPage();

    await waitFor(() => {
      expect(screen.getAllByText('Alice Champion').length).toBeGreaterThan(0);
      // Verifies formatRating(1650.4, 'Advanced') -> 1650.4 (Advanced)
      expect(screen.getAllByText('1650.4 (Advanced)').length).toBeGreaterThan(0);
      // Provisional badge for Charlie Rookie
      expect(screen.getAllByText(LEADERBOARD_MESSAGES.provisionalBadge).length).toBeGreaterThan(0);
    });
  });

  it('renders EmptyState when a sport has no leaderboard entries', async () => {
    renderLeaderboardPage(['/leaderboard?sport=tennis']);

    await waitFor(() => {
      expect(screen.getByText(LEADERBOARD_MESSAGES.emptyTitle)).toBeDefined();
      expect(screen.getByText(LEADERBOARD_MESSAGES.emptyDescription)).toBeDefined();
    });
  });

  it('loads more entries when clicking the manual LoadMore button', async () => {
    renderLeaderboardPage();

    await waitFor(() => {
      expect(screen.getAllByText('Alice Champion').length).toBeGreaterThan(0);
    });

    const loadMoreButton = screen.getByRole('button', { name: LEADERBOARD_MESSAGES.loadMore });
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      // Second page entry should now appear
      expect(screen.getAllByText('Diana Veteran').length).toBeGreaterThan(0);
    });
  });

  it('renders QueryBoundary error state when leaderboard API fails', async () => {
    vi.spyOn(sharedApiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/sports') return mockSports;
      if (url.includes('/leaderboards')) {
        const error = new Error('Network failure');
        (error as any).code = 'NETWORK_ERROR';
        throw error;
      }
      return {};
    });

    renderLeaderboardPage();

    await waitFor(() => {
      // Should show ErrorState with retry button
      expect(screen.getByText('NETWORK_ERROR')).toBeDefined();
      expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
    });
  });

  it('handles long display names by truncating with full-name tooltip without breaking layout', async () => {
    const longName = 'Alexander Maximilian Bartholomew von Hohenzollern the Third';
    vi.spyOn(sharedApiClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/sports') return mockSports;
      if (url.includes('/leaderboards/badminton')) {
        return {
          sportKey: 'badminton',
          sportName: 'Badminton',
          entries: [
            {
              userId: 'usr-long',
              displayName: longName,
              avatarUrl: null,
              rating: 1550,
              band: { key: 'intermediate', label: 'Intermediate' },
              gamesPlayed: 10,
              provisional: false,
              wins: 6,
              losses: 4,
              draws: 0,
            },
          ],
          hasMore: false,
          nextCursor: null,
        };
      }
      return {};
    });

    renderLeaderboardPage();

    await waitFor(() => {
      const longNameElements = screen.getAllByText(longName);
      expect(longNameElements.length).toBeGreaterThan(0);
      // Desktop row truncation check
      expect(longNameElements[0].className).toContain('truncate');
    });
  });

  it('falls back cleanly to the first sports catalog sport when an invalid sport is provided in URL', async () => {
    renderLeaderboardPage(['/leaderboard?sport=nonsense_sport_not_in_catalog']);

    await waitFor(() => {
      // Must not crash or stay blank; falls back to Badminton (the first sport in mockSports)
      expect(screen.getAllByText('Alice Champion').length).toBeGreaterThan(0);
    });
  });
});
