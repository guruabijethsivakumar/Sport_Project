import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendanceFeedbackModal } from '../src/components/games/AttendanceFeedbackModal';
import { ToastProvider } from '../src/components/ui/Toast';

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  getConfig: () => ({ pollingIntervalMs: 0 }),
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'host-1', name: 'Host Player', role: 'player' },
    isAuthenticated: true,
    client: mockClient,
  }),
}));

describe('Host Attendance & Reliability Feedback Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.clearAllMocks();

    mockClient.get.mockImplementation(async (url: string) => {
      if (url.includes('/feedback')) {
        return { success: true, feedback: [] };
      }
      return {};
    });

    mockClient.post.mockImplementation(async (url: string) => {
      if (url.includes('/feedback')) {
        return { success: true, data: { id: 'fb-1', attendance: 'attended' } };
      }
      return {};
    });
  });

  const participants = [
    { userId: 'host-1', name: 'Host Player', role: 'host' },
    { userId: 'player-2', name: 'Alex Partner', role: 'player' },
  ];

  it('renders participant list excluding host with attendance toggle buttons', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AttendanceFeedbackModal
            isOpen={true}
            onClose={vi.fn()}
            gameId="game-1"
            participants={participants}
            hostId="host-1"
          />
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Match Attendance & Reliability Feedback')).toBeDefined();
      expect(screen.getByText('Alex Partner')).toBeDefined();
      expect(screen.queryByText('Host Player')).toBeNull(); // Host is excluded
    });

    expect(screen.getByRole('button', { name: 'Attended' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'No Show' })).toBeDefined();
  });

  it('submits attendance feedback to the backend API', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AttendanceFeedbackModal
            isOpen={true}
            onClose={vi.fn()}
            gameId="game-1"
            participants={participants}
            hostId="host-1"
          />
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alex Partner')).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Status' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        '/games/game-1/feedback',
        expect.objectContaining({
          targetUserId: 'player-2',
          attendance: 'attended',
        })
      );
    });
  });
});
