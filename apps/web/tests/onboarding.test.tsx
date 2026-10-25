import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingPage } from '../src/pages/onboarding/OnboardingPage';
import { AuthProvider, sharedApiClient } from '../src/auth/AuthContext';
import { CITIES_CATALOG } from '@playmatch/shared';

const mockSports = [
  {
    _id: 'sport-badminton',
    id: 'sport-badminton',
    key: 'badminton',
    name: 'Badminton',
    skillBands: [
      { key: 'beginner', label: 'Beginner', seedRating: 1000 },
      { key: 'intermediate', label: 'Intermediate', seedRating: 1200 },
    ],
    playStyles: [{ key: 'all_round', label: 'All-Round' }],
  },
  {
    _id: 'sport-tennis',
    id: 'sport-tennis',
    key: 'tennis',
    name: 'Tennis',
    skillBands: [
      { key: 'beginner', label: 'Beginner', seedRating: 1000 },
    ],
  },
];

function renderOnboardingPage(initialEntries = ['/onboarding']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/" element={<div>Home Destination</div>} />
            <Route path="/login" element={<div>Login Destination</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('OnboardingPage Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    sharedApiClient.getAdapter().setAccessToken('test-token-valid');
    vi.spyOn(sharedApiClient, 'refreshSession').mockResolvedValue('valid-token');

    // Default mock for profile/me and sports catalog
    vi.spyOn(sharedApiClient, 'get').mockImplementation(async (path: string) => {
      if (path === '/profile/me') {
        return {
          id: 'u-1',
          displayName: 'Alex Morgan',
          onboarding: { status: 'in_progress', completedSteps: [] },
        } as any;
      }
      if (path === '/sports') {
        return { sports: mockSports } as any;
      }
      if (path === '/profile/me/onboarding') {
        return {
          status: 'in_progress',
          completedSteps: [],
          missingSteps: ['basic_info', 'sports', 'location', 'availability'],
          isComplete: false,
        } as any;
      }
      return {} as any;
    });

    vi.spyOn(sharedApiClient, 'put').mockResolvedValue({ success: true } as any);
    vi.spyOn(sharedApiClient, 'post').mockResolvedValue({ success: true } as any);
  });

  it('renders step 1 (Basic Info) by default when basic_info is missing', async () => {
    renderOnboardingPage();

    await waitFor(() => {
      expect(screen.getByText('Tell us about yourself')).toBeDefined();
      expect(screen.getByPlaceholderText('e.g. Alex Morgan')).toBeDefined();
    });
  });

  it('redirects completed user away from /onboarding immediately', async () => {
    vi.spyOn(sharedApiClient, 'get').mockImplementation(async (path: string) => {
      if (path === '/profile/me/onboarding') {
        return {
          status: 'completed',
          completedSteps: ['basic_info', 'sports', 'location', 'availability'],
          missingSteps: [],
          isComplete: true,
        } as any;
      }
      return {} as any;
    });

    renderOnboardingPage();

    await waitFor(() => {
      expect(screen.getByText('Home Destination')).toBeDefined();
    });
  });

  it('resumes at location step when basic_info and sports are completed', async () => {
    vi.spyOn(sharedApiClient, 'get').mockImplementation(async (path: string) => {
      if (path === '/profile/me/onboarding') {
        return {
          status: 'in_progress',
          completedSteps: ['basic_info', 'sports'],
          missingSteps: ['location', 'availability'],
          isComplete: false,
        } as any;
      }
      if (path === '/sports') {
        return { sports: mockSports } as any;
      }
      return {} as any;
    });

    renderOnboardingPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Set your game location/i })).toBeDefined();
      expect(screen.getAllByText(/Chennai, Tamil Nadu/i).length).toBeGreaterThan(0);
    });
  });

  it('includes Chennai first in the fallback city catalog without hardcoded component coords', () => {
    expect(CITIES_CATALOG[0].name).toBe('Chennai');
    expect(CITIES_CATALOG[0].label).toContain('Chennai');
    expect(CITIES_CATALOG[0].coordinates).toEqual([80.27, 13.08]);
  });

  it('validates basic info and saves to /profile/me/basic on continue', async () => {
    const putSpy = vi.spyOn(sharedApiClient, 'put');

    renderOnboardingPage();

    await waitFor(() => {
      const input = screen.getByPlaceholderText('e.g. Alex Morgan') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe('Alex Morgan');
    });

    const nameInput = screen.getByPlaceholderText('e.g. Alex Morgan');
    fireEvent.change(nameInput, { target: { value: 'Alex Superplayer' } });

    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith('/profile/me/basic', expect.objectContaining({
        displayName: 'Alex Superplayer',
      }));
    });
  });
});
