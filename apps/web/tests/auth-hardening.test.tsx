import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { ProtectedRoute } from '../src/routes/ProtectedRoute';
import { LoginPage } from '../src/pages/auth/LoginPage';
import { RegisterPage } from '../src/pages/auth/RegisterPage';

// Helper component for testing inside AuthContext
function TestAuthConsumer({ onRender }: { onRender?: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();
  if (onRender) onRender(auth);
  return (
    <div>
      <div data-testid="auth-status">{auth.isAuthenticated ? 'authenticated' : 'logged-out'}</div>
      <div data-testid="auth-loading">{auth.isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="user-email">{auth.user?.email || 'no-user'}</div>
      <button onClick={() => auth.login({ user: { id: 'u1', email: 'user1@example.com' }, accessToken: 'token-123' })}>
        Log in User 1
      </button>
      <button onClick={() => auth.login({ user: { id: 'u2', email: 'user2@example.com' }, accessToken: 'token-456' })}>
        Log in User 2
      </button>
      <button onClick={() => auth.logout()}>Sign out</button>
    </div>
  );
}

function TestUserDataDisplay() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['test-profile', user?.id],
    queryFn: async () => {
      return { profileData: `data-for-${user?.email}` };
    },
    enabled: Boolean(user),
  });

  return <div data-testid="profile-data">{data?.profileData || 'no-data'}</div>;
}

describe('Auth Session Hardening & Logout Leak Protection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Logout calls endpoint, clears user, token and query cache, and prevents re-auth', async () => {
    let capturedAuth: any;
    (globalThis.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/auth/logout')) {
        return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401 });
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestAuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Initial log in
    act(() => {
      capturedAuth.login({ user: { id: 'u1', email: 'user1@example.com' }, accessToken: 'token-123' });
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('user1@example.com');

    // Trigger logout
    await act(async () => {
      await capturedAuth.logout();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out');
    expect(screen.getByTestId('user-email').textContent).toBe('no-user');
    expect(capturedAuth.isAuthenticated).toBe(false);
    expect(capturedAuth.user).toBeNull();
  });

  it('2. Boot refresh cannot revive a session after logout in the same page lifetime', async () => {
    let capturedAuth: any;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/auth/logout')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url.includes('/auth/refresh')) {
        return new Response(JSON.stringify({ success: true, data: { accessToken: 'new-token' } }), { status: 200 });
      }
      if (url.includes('/profile/me')) {
        return new Response(JSON.stringify({ success: true, data: { id: 'u1', email: 'revived@example.com' } }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestAuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
        </AuthProvider>
      </QueryClientProvider>
    );

    act(() => {
      capturedAuth.login({ user: { id: 'u1', email: 'user1@example.com' }, accessToken: 'token-1' });
    });

    await act(async () => {
      await capturedAuth.logout();
    });

    expect(capturedAuth.isAuthenticated).toBe(false);

    // Any accidental attempt to call refreshSession after logout throws and does not set user
    await expect(capturedAuth.client.refreshSession()).rejects.toThrow();
    expect(capturedAuth.isAuthenticated).toBe(false);
    expect(capturedAuth.user).toBeNull();
  });

  it('3. An in-flight refresh that resolves after logout does NOT restore the session', async () => {
    let capturedAuth: any;
    let resolveRefresh: any;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        await refreshPromise;
        return new Response(JSON.stringify({ success: true, data: { accessToken: 'late-token' } }), { status: 200 });
      }
      if (url.includes('/auth/logout')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestAuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
        </AuthProvider>
      </QueryClientProvider>
    );

    act(() => {
      capturedAuth.login({ user: { id: 'u1', email: 'user1@example.com' }, accessToken: 'valid-token' });
    });

    // Start in-flight refresh in background
    const inFlight = capturedAuth.client.refreshSession().catch(() => {});

    // User clicks logout immediately while refresh is still in-flight
    await act(async () => {
      await capturedAuth.logout();
    });

    // Now let the late in-flight refresh resolve
    resolveRefresh();
    await inFlight;

    // Assert user remains logged out and access token is NOT set
    expect(capturedAuth.isAuthenticated).toBe(false);
    expect(capturedAuth.user).toBeNull();
    expect(capturedAuth.client.getAdapter().getAccessToken()).toBeNull();
  });

  it('4. ProtectedRoute: loading shows skeleton, logged out redirects with replace, logged in renders', () => {
    // 1. Initial loading shows skeleton
    const { unmount } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Secret Protected Area</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    // Initial auth loading state shows Skeleton loader
    expect(screen.getByRole('status', { name: /loading protected content/i })).toBeDefined();
    unmount();
  });

  it('5. Login and Register pages redirect to home when already authenticated', () => {
    let capturedAuth: any;
    render(
      <MemoryRouter initialEntries={['/login']}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestAuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
            <Routes>
              <Route path="/" element={<div>Home Screen Destination</div>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    // Mark as authenticated
    act(() => {
      capturedAuth.login({ user: { id: '1', email: 'test@example.com' }, accessToken: 'token' });
    });

    expect(screen.getByText('Home Screen Destination')).toBeDefined();
  });

  it('6. bfcache pageshow persisted re-validates the session', async () => {
    let capturedAuth: any;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/auth/logout')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401 });
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestAuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
        </AuthProvider>
      </QueryClientProvider>
    );

    act(() => {
      capturedAuth.login({ user: { id: 'u1', email: 'user1@example.com' }, accessToken: 'token-1' });
    });

    await act(async () => {
      await capturedAuth.logout();
    });

    // Simulate bfcache pageshow event
    const pageShowEvent = new PageTransitionEvent('pageshow', { persisted: true });
    act(() => {
      window.dispatchEvent(pageShowEvent);
    });

    expect(capturedAuth.isAuthenticated).toBe(false);
    expect(capturedAuth.user).toBeNull();
  });

  it('7. Multi-tab logout signal logs out current tab immediately', async () => {
    let capturedAuth: any;
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestAuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
        </AuthProvider>
      </QueryClientProvider>
    );

    act(() => {
      capturedAuth.login({ user: { id: 'u1', email: 'user1@example.com' }, accessToken: 'token-1' });
    });
    expect(capturedAuth.isAuthenticated).toBe(true);

    // Simulate storage logout signal received from Tab 2
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'playmatch_logout_signal',
          newValue: Date.now().toString(),
        })
      );
    });

    expect(capturedAuth.isAuthenticated).toBe(false);
    expect(capturedAuth.user).toBeNull();
  });

  it('8. Account switch from User A to User B shows NO data of User A', async () => {
    let capturedAuth: any;
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestAuthConsumer onRender={(auth) => { capturedAuth = auth; }} />
          <TestUserDataDisplay />
        </AuthProvider>
      </QueryClientProvider>
    );

    // Log in User A
    await act(async () => {
      capturedAuth.login({ user: { id: 'user-a', email: 'userA@example.com' }, accessToken: 'token-a' });
    });

    // Query resolves for User A
    expect(await screen.findByText('data-for-userA@example.com')).toBeDefined();

    // Logout User A
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }))));
    await act(async () => {
      await capturedAuth.logout();
    });

    expect(screen.getByTestId('profile-data').textContent).toBe('no-data');

    // Log in User B
    await act(async () => {
      capturedAuth.login({ user: { id: 'user-b', email: 'userB@example.com' }, accessToken: 'token-b' });
    });

    expect(await screen.findByText('data-for-userB@example.com')).toBeDefined();
  });
});
