import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboardPage } from '../src/pages/admin/AdminDashboardPage';
import { ToastProvider } from '../src/components/ui/Toast';

const mockVenues = [
  {
    id: 'venue-101',
    name: 'Marina Smash Badminton Arena',
    status: 'active',
    address: { line1: '42 Marina Beach Rd', city: 'Chennai' },
    areaLabel: 'Marina Beach',
    courts: [{ courtId: 'c-1', name: 'Court 1' }],
  },
];

const mockGames = [
  {
    id: 'game-1',
    sportKey: 'badminton',
    formatKey: 'singles',
    status: 'open',
    startsAt: '2026-10-15T18:00:00.000Z',
    venueName: 'Marina Smash Badminton Arena',
  },
  {
    id: 'game-2',
    sportKey: 'football',
    formatKey: '5_a_side',
    status: 'disputed',
    startsAt: '2026-10-16T19:00:00.000Z',
    venueName: 'Marina Turf',
  },
];

const mockNotifications = [
  {
    id: 'notif-1',
    type: 'game_update',
    message: 'Match schedule confirmed',
    createdAt: '2026-10-12T10:00:00.000Z',
  },
];

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  getConfig: () => ({ pollingIntervalMs: 0 }),
};

let currentMockUser = {
  id: 'user-1',
  name: 'Standard Player',
  email: 'player@example.com',
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
    useNotifications: () => ({
      data: { notifications: mockNotifications },
      isLoading: false,
    }),
  };
});

describe('Module 2.4: AdminDashboardPage (Platform Overview Without Admin Privileges)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    currentMockUser = {
      id: 'user-1',
      name: 'Standard Player',
      email: 'player@example.com',
      role: 'player',
    };

    mockClient.get.mockImplementation(async (url: string) => {
      if (url === '/venues/mine') {
        return { success: true, venues: mockVenues };
      }
      if (url === '/games/me') {
        return { success: true, games: mockGames };
      }
      return {};
    });
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders platform dashboard with user role and real operational metric counts', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Platform Operations Dashboard')).toBeDefined();
      expect(screen.getByText('Player Account')).toBeDefined();
      expect(screen.getByText('My Managed Venues')).toBeDefined();
      expect(screen.getByText('My Active Games')).toBeDefined();
      expect(screen.getByText('Disputed Matches')).toBeDefined();
    });

    // Metric values from queries
    expect(screen.getByText('Marina Smash Badminton Arena')).toBeDefined();
    expect(screen.getByText('football')).toBeDefined();
  });

  it('displays administrative dispute governance notice for non-admin accounts', async () => {
    renderDashboard();

    // Wait for the dashboard to load, then switch to the Disputes tab
    await waitFor(() => {
      expect(screen.getByText('Platform Operations Dashboard')).toBeDefined();
    });

    // Radix UI TabsTrigger activates on mouseDown
    const disputesTab = screen.getByRole('tab', { name: /disputes/i });
    fireEvent.mouseDown(disputesTab, { button: 0 });

    await waitFor(() => {
      expect(screen.getByText('Administrative Dispute Governance')).toBeDefined();
      expect(
        screen.getByText(/Platform-level dispute force-resolution.*is securely reserved for system administrators/i)
      ).toBeDefined();
    });

    // Ensure non-admin is NOT shown privileged resolution controls
    expect(screen.queryByRole('button', { name: /apply resolution/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /void match/i })).toBeNull();
  });

  it('displays permission boundaries documentation explicitly', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Security & Permission Boundaries')).toBeDefined();
      expect(screen.getByText(/Suspending or reinstating arbitrary user accounts/i)).toBeDefined();
      expect(screen.getByText(/Modifying global user roles or access tiers/i)).toBeDefined();
    });
  });

  it('shows venue owner badge and direct venue management CTA for venue owner accounts', async () => {
    currentMockUser = {
      id: 'owner-1',
      name: 'Owner Jane',
      email: 'owner@example.com',
      role: 'venue_owner',
    };

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Venue Owner')).toBeDefined();
      expect(screen.getByRole('button', { name: /manage venues/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /open venue console/i })).toBeDefined();
    });
  });
});
