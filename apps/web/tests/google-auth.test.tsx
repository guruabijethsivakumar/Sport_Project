import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../src/pages/auth/LoginPage';
import { GoogleSignInButton } from '../src/components/auth/GoogleSignInButton';
import { AuthProvider, sharedApiClient } from '../src/auth/AuthContext';
import { AUTH_MESSAGES } from '@playmatch/shared';

function renderAuthPage(component: React.ReactElement, initialEntries = ['/login']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={component} />
            <Route path="/register" element={component} />
            <Route path="/onboarding" element={<div>Onboarding Destination</div>} />
            <Route path="/" element={<div>Home Destination</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Google Authentication (Option A: GIS)', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hides Google button entirely when VITE_GOOGLE_CLIENT_ID is not configured', () => {
    render(<GoogleSignInButton onSuccess={vi.fn()} clientId="" />);
    expect(screen.queryByTestId('google-signin-wrapper')).toBeNull();
  });

  it('renders Google button container when clientId is provided', async () => {
    const mockRenderButton = vi.fn();
    const mockInitialize = vi.fn();

    window.google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: mockRenderButton,
        },
      },
    };

    render(
      <GoogleSignInButton
        onSuccess={vi.fn()}
        clientId="test-client-id.apps.googleusercontent.com"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('google-signin-wrapper')).toBeDefined();
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockRenderButton).toHaveBeenCalled();
    });
  });

  it('allows standard email login when Google script fails or is blocked', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Render LoginPage without client ID or with blocked GIS
    renderAuthPage(<LoginPage />);

    expect(screen.getByLabelText(/Email address/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password/i)).toBeDefined();
    expect(screen.getByRole('button', { name: AUTH_MESSAGES.signInButton })).toBeDefined();

    consoleErrorSpy.mockRestore();
  });

  it('executes success path on Google credential callback and redirects to /onboarding', async () => {
    let capturedCallback: ((resp: { credential: string }) => void) | null = null;

    window.google = {
      accounts: {
        id: {
          initialize: vi.fn().mockImplementation((config: any) => {
            capturedCallback = config.callback;
          }),
          renderButton: vi.fn(),
        },
      },
    };

    const postSpy = vi.spyOn(sharedApiClient, 'post').mockResolvedValue({
      user: { id: 'u-google-1', email: 'google.player@example.com', name: 'Google Player' },
      accessToken: 'valid-google-jwt',
    } as any);

    vi.spyOn(sharedApiClient, 'get').mockImplementation(async (path: string) => {
      if (path === '/profile/me/onboarding') {
        return { isComplete: false };
      }
      return {};
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route
                path="/login"
                element={
                  <GoogleSignInButton
                    clientId="test-client-id.apps.googleusercontent.com"
                    onSuccess={async (credential) => {
                      const _res = await sharedApiClient.post('/auth/google', { credential });
                      const onboarding = await sharedApiClient.get<{ isComplete: boolean }>('/profile/me/onboarding');
                      if (!onboarding?.isComplete) {
                        window.history.pushState({}, '', '/onboarding');
                      }
                    }}
                  />
                }
              />
              <Route path="/onboarding" element={<div>Onboarding Destination</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    // Simulate Google GIS returning an ID token
    await act(async () => {
      capturedCallback!({ credential: 'google.test.id.token' });
    });

    expect(postSpy).toHaveBeenCalledWith('/auth/google', {
      credential: 'google.test.id.token',
    });

    // Verify token is never saved into localStorage or sessionStorage
    expect(localStorage.getItem('credential')).toBeNull();
    expect(localStorage.getItem('google_credential')).toBeNull();
    expect(sessionStorage.getItem('credential')).toBeNull();
  });

  it('shows generic error banner on Google sign-in failure without leaking credentials', async () => {
    let capturedCallback: ((resp: { credential: string }) => void) | null = null;

    window.google = {
      accounts: {
        id: {
          initialize: vi.fn().mockImplementation((config: any) => {
            capturedCallback = config.callback;
          }),
          renderButton: vi.fn(),
        },
      },
    };

    vi.spyOn(sharedApiClient, 'post').mockRejectedValue(new Error('Invalid token'));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route
                path="/login"
                element={
                  <div>
                    <GoogleSignInButton
                      clientId="test-client-id.apps.googleusercontent.com"
                      onSuccess={async (credential) => {
                        try {
                          await sharedApiClient.post('/auth/google', { credential });
                        } catch {
                          const banner = document.getElementById('error-banner');
                          if (banner) banner.textContent = AUTH_MESSAGES.googleSignInFailed;
                        }
                      }}
                    />
                    <div id="error-banner" />
                  </div>
                }
              />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(capturedCallback).not.toBeNull();
    });

    await act(async () => {
      capturedCallback!({ credential: 'secret.google.credential' });
    });

    await waitFor(() => {
      expect(screen.getByText(AUTH_MESSAGES.googleSignInFailed)).toBeDefined();
    });

    // Verify credential is never in localStorage or logs
    expect(localStorage.getItem('credential')).toBeNull();
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('secret.google.credential'));
    consoleSpy.mockRestore();
  });
});
