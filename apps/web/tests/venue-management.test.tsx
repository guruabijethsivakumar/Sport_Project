import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VenueManagementPage } from '../src/pages/venues/VenueManagementPage';
import { ToastProvider } from '../src/components/ui/Toast';

const mockSports = [
  {
    key: 'badminton',
    name: 'Badminton',
    formats: [{ key: 'singles', label: 'Singles' }],
  },
  {
    key: 'football',
    name: 'Football',
    formats: [{ key: '5_a_side', label: '5-a-side' }],
  },
];

const mockVenue = {
  id: 'venue-101',
  name: 'Marina Smash Badminton Arena',
  description: 'Premier indoor wooden badminton facility.',
  status: 'active',
  address: {
    line1: '42 Marina Beach Rd',
    city: 'Chennai',
  },
  areaLabel: 'Marina Beach',
  timezone: 'Asia/Kolkata',
  location: {
    type: 'Point',
    coordinates: [80.28, 13.06],
  },
  courts: [
    {
      courtId: 'court-1',
      name: 'Court 1',
      sportKeys: ['badminton'],
      isActive: true,
    },
    {
      courtId: 'court-2',
      name: 'Court 2',
      sportKeys: ['badminton'],
      isActive: false,
    },
  ],
  closures: [
    {
      closureId: 'close-1',
      startsAt: '2026-10-20T08:00:00.000Z',
      endsAt: '2026-10-20T12:00:00.000Z',
      reason: 'Mat resurfacing',
    },
  ],
};

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getConfig: () => ({ pollingIntervalMs: 0 }),
};

let currentMockUser = {
  id: 'owner-user-id',
  name: 'Venue Owner Dave',
  email: 'owner@example.com',
  role: 'venue_owner',
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
  };
});

describe('Module 2.4: VenueManagementPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    currentMockUser = {
      id: 'owner-user-id',
      name: 'Venue Owner Dave',
      email: 'owner@example.com',
      role: 'venue_owner',
    };

    mockClient.get.mockImplementation(async (url: string) => {
      if (url === '/venues/mine') {
        return { success: true, venues: [mockVenue] };
      }
      if (url.includes('/availability')) {
        return {
          success: true,
          data: [
            {
              courtId: 'court-1',
              courtName: 'Court 1',
              availableSlots: [{ startsAt: '2026-10-15T10:00:00.000Z', endsAt: '2026-10-15T11:00:00.000Z' }],
              bookedIntervals: [],
            },
          ],
        };
      }
      return {};
    });

    mockClient.post.mockImplementation(async () => ({ success: true, id: 'new-venue-99' }));
    mockClient.patch.mockImplementation(async () => ({ success: true }));
    mockClient.delete.mockImplementation(async () => ({ success: true }));
  });

  const renderVenueManagement = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/venues/manage']}>
            <Routes>
              <Route path="/venues/manage" element={<VenueManagementPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders managed venue overview, courts, and availability schedule', async () => {
    renderVenueManagement();

    await waitFor(() => {
      expect(screen.getByText('Venue Management')).toBeDefined();
      expect(screen.getByText('Marina Smash Badminton Arena')).toBeDefined();
      expect(screen.getByText('Active')).toBeDefined();
      expect(screen.getByText('Court 1')).toBeDefined();
      expect(screen.getByText('Court 2')).toBeDefined();
      expect(screen.getByText('Mat resurfacing')).toBeDefined();
    });
  });

  it('toggles court active state via patch endpoint', async () => {
    renderVenueManagement();

    await waitFor(() => {
      expect(screen.getByText('Court 1')).toBeDefined();
    });

    // Court 1 is active, clicking "Deactivate" toggles it
    const deactivateBtn = screen.getByRole('button', { name: 'Deactivate' });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(mockClient.patch).toHaveBeenCalledWith(
        '/venues/venue-101/courts/court-1',
        { isActive: false }
      );
    });
  });

  it('adds a new court to the selected venue', async () => {
    renderVenueManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add court/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /add court/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add Court / Pitch' })).toBeDefined();
    });

    const courtNameInput = document.getElementById('court-name') as HTMLInputElement;
    fireEvent.change(courtNameInput, { target: { value: 'Badminton Court 3' } });

    // Click submit in modal
    const submitBtn = within(screen.getByRole('dialog')).getByRole('button', { name: 'Add Court' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith(
        '/venues/venue-101/courts',
        expect.objectContaining({
          name: 'Badminton Court 3',
          sportKeys: ['badminton'],
          isActive: true,
        })
      );
    });
  });

  it('displays empty state when user has no venues registered', async () => {
    mockClient.get.mockImplementation(async (url: string) => {
      if (url === '/venues/mine') {
        return { success: true, venues: [] };
      }
      return {};
    });

    renderVenueManagement();

    await waitFor(() => {
      expect(screen.getByText('No Venues Registered Yet')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Register First Venue' })).toBeDefined();
    });
  });

  it('displays permission notice when standard player visits venue management', async () => {
    currentMockUser = {
      id: 'player-id',
      name: 'Player Sam',
      email: 'player@example.com',
      role: 'player',
    };

    renderVenueManagement();

    await waitFor(() => {
      expect(screen.getByText('Venue Owner Permissions')).toBeDefined();
    });
  });
});
