import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateGamePage } from '../src/pages/games/CreateGamePage';
import { ToastProvider } from '../src/components/ui/Toast';

// Polyfill ResizeObserver for Radix UI in jsdom
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Polyfill pointerCapture methods for Radix UI Select in jsdom
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
}

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

const mockVenues = [
  {
    venue: {
      _id: 'venue-1',
      name: 'Marina Smash Arena',
      areaLabel: 'Marina Beach',
      address: { city: 'Chennai', line1: '42 Beach Rd' },
      courts: [
        { courtId: 'court-b1', name: 'Badminton Court 1', sportKeys: ['badminton'], isActive: true },
        { courtId: 'court-b2', name: 'Badminton Court 2', sportKeys: ['badminton'], isActive: true },
      ],
    },
  },
];

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
      homeLocation: { coordinates: [80.28, 13.06] },
    },
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

describe('CreateGamePage Wizard Flow & Validation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    mockClient.get.mockImplementation(async (url: string) => {
      if (url.startsWith('/venues')) {
        return {
          success: true,
          data: { items: mockVenues },
        };
      }
      return {};
    });

    mockClient.post.mockImplementation(async (url: string, data: any) => {
      if (url === '/games') {
        return {
          success: true,
          data: {
            id: 'new-game-123',
            sportKey: data.sportKey,
            formatKey: data.formatKey,
            status: 'open',
          },
        };
      }
      return {};
    });
  });

  const renderCreateGamePage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/games/new']}>
            <Routes>
              <Route path="/games/new" element={<CreateGamePage />} />
              <Route path="/games/:id" element={<div>Game Detail Destination</div>} />
              <Route path="/games" element={<div>Games Discovery Destination</div>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders step 1 with sports catalog and prevents progression without selection', async () => {
    renderCreateGamePage();

    expect(screen.getByText('Schedule a New Game')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Select Sport & Format' })).toBeDefined();

    // Click Continue without selecting sport
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Please select a sport')).toBeDefined();
    });
  });

  it('validates step 2 date and time: rejects missing values', async () => {
    renderCreateGamePage();

    // Select sport
    const sportTrigger = screen.getByText('Choose sport...');
    fireEvent.click(sportTrigger);
    const badmintonOption = await screen.findByRole('option', { name: 'Badminton' });
    fireEvent.click(badmintonOption);

    // Select format
    await waitFor(() => {
      expect(screen.getByText('Choose format...')).toBeDefined();
    });
    const formatTrigger = screen.getByText('Choose format...');
    fireEvent.click(formatTrigger);
    const formatOption = await screen.findByRole('option', { name: /Singles/i });
    fireEvent.click(formatOption);

    // Click Continue to go to Step 2
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Date & Time' })).toBeDefined();
    });

    // Attempt to continue with blank date and time
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Game date is required')).toBeDefined();
      expect(screen.getByText('Start time is required')).toBeDefined();
    });
  });

  it('preserves form state during back navigation between steps', async () => {
    renderCreateGamePage();

    // Select sport
    const sportTrigger = screen.getByText('Choose sport...');
    fireEvent.click(sportTrigger);
    const badmintonOption = await screen.findByRole('option', { name: 'Badminton' });
    fireEvent.click(badmintonOption);

    // Select format
    await waitFor(() => {
      expect(screen.getByText('Choose format...')).toBeDefined();
    });
    const formatTrigger = screen.getByText('Choose format...');
    fireEvent.click(formatTrigger);
    const formatOption = await screen.findByRole('option', { name: /Singles/i });
    fireEvent.click(formatOption);

    // Next to Step 2
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Date & Time' })).toBeDefined();
    });

    // Go Back to Step 1
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Select Sport & Format' })).toBeDefined();
      expect(screen.getByText('Badminton')).toBeDefined();
      expect(screen.getByText(/Singles \(1v1\)/i)).toBeDefined();
    });
  });

  it('handles backend conflict errors on game creation gracefully', async () => {
    mockClient.post.mockRejectedValueOnce(
      new Error('You already have another active game scheduled during this time window.')
    );

    renderCreateGamePage();

    // Step 1: Sport & format
    fireEvent.click(screen.getByText('Choose sport...'));
    fireEvent.click(await screen.findByRole('option', { name: 'Badminton' }));

    await waitFor(() => expect(screen.getByText('Choose format...')).toBeDefined());
    fireEvent.click(screen.getByText('Choose format...'));
    fireEvent.click(await screen.findByRole('option', { name: /Singles/i }));

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2: Date & time
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Date & Time' })).toBeDefined());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const dateInput = document.getElementById('game-date') as HTMLInputElement;
    const timeInput = document.getElementById('start-time') as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: dateStr } });
    fireEvent.change(timeInput, { target: { value: '18:00' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3: Venue selection
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Venue & Location' })).toBeDefined()
    );
    fireEvent.click(screen.getByText('Choose arena...'));
    fireEvent.click(await screen.findByRole('option', { name: /Marina Smash Arena/i }));

    await waitFor(() => expect(screen.getByText('Choose court...')).toBeDefined());
    fireEvent.click(screen.getByText('Choose court...'));
    fireEvent.click(await screen.findByRole('option', { name: /Badminton Court 1/i }));

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 4: Rules & capacity
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Rules & Participation' })).toBeDefined()
    );
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 5: Review & publish
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Review & Confirm Match' })).toBeDefined()
    );
    const publishBtn = screen.getByRole('button', { name: /publish game/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      const errorElements = screen.getAllByText(
        /You already have another active game scheduled during this time window/i
      );
      expect(errorElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
