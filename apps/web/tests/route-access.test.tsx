import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { allDomainRoutes } from '../src/routes/registry';
import { ProtectedRoute, validateNextPath } from '../src/routes/ProtectedRoute';
import { AuthProvider, sharedApiClient } from '../src/auth/AuthContext';
import { LoginPage } from '../src/pages/auth/LoginPage';
import { RegisterPage } from '../src/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../src/pages/auth/ForgotPasswordPage';

describe('Route Access, Registry Flags & Next-Query Validation (Wireframe Spec)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
    sharedApiClient.setLoggingOut(false);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  describe('1. Route Registry Flag Verification', () => {
    it('ensures every route in allDomainRoutes has an explicit boolean isProtected flag', () => {
      expect(allDomainRoutes.length).toBeGreaterThan(0);
      for (const route of allDomainRoutes) {
        expect(
          typeof route.isProtected,
          `Route ${route.path} must define an explicit boolean isProtected`
        ).toBe('boolean');
      }
    });

    it('verifies public routes are marked isProtected === false', () => {
      const publicPaths = ['/', '/login', '/register', '/forgot-password', '/unauthorized', '/404'];
      for (const p of publicPaths) {
        const found = allDomainRoutes.find((r) => r.path === p);
        expect(found, `Public route ${p} must exist in route registry`).toBeDefined();
        expect(found?.isProtected, `Route ${p} must have isProtected: false`).toBe(false);
      }
    });

    it('verifies protected routes are marked isProtected === true', () => {
      const protectedPaths = ['/leaderboard', '/recommendations', '/onboarding', '/kit'];
      for (const p of protectedPaths) {
        const found = allDomainRoutes.find((r) => r.path === p);
        expect(found, `Protected route ${p} must exist in route registry`).toBeDefined();
        expect(found?.isProtected, `Route ${p} must have isProtected: true`).toBe(true);
      }
    });
  });

  describe('2. validateNextPath & Open Redirect Prevention', () => {
    it('accepts valid internal application paths', () => {
      expect(validateNextPath('/leaderboard')).toBe('/leaderboard');
      expect(validateNextPath('/recommendations?sport=tennis')).toBe('/recommendations?sport=tennis');
      expect(validateNextPath('/onboarding')).toBe('/onboarding');
      expect(validateNextPath('/kit')).toBe('/kit');
    });

    it('rejects protocol-relative and external open redirect targets', () => {
      expect(validateNextPath('//evil.com')).toBeNull();
      expect(validateNextPath('https://evil.com')).toBeNull();
      expect(validateNextPath('http://evil.com')).toBeNull();
      expect(validateNextPath('javascript:alert(1)')).toBeNull();
    });

    it('rejects auth routes to prevent redirect loops', () => {
      expect(validateNextPath('/login')).toBeNull();
      expect(validateNextPath('/register')).toBeNull();
      expect(validateNextPath('/forgot-password')).toBeNull();
      expect(validateNextPath('/logout')).toBeNull();
      expect(validateNextPath(null)).toBeNull();
      expect(validateNextPath('')).toBeNull();
    });
  });

  describe('3. ProtectedRoute Guest Redirect with Validated next', () => {
    it('redirects guest to /login?next=... when visiting a protected route', async () => {
      vi.spyOn(sharedApiClient, 'refreshSession').mockRejectedValue(new Error('No active session'));
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/leaderboard']}>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <div data-testid="login-target">
                      Login Target (URL query will contain next)
                    </div>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <div data-testid="secret">Leaderboard Secret Content</div>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-target')).toBeDefined();
        expect(screen.queryByTestId('secret')).toBeNull();
      });
    });
  });

  describe('4. Logged-in Users Redirect to / on Auth Pages', () => {
    beforeEach(() => {
      vi.spyOn(sharedApiClient, 'refreshSession').mockResolvedValue('valid-token');
      vi.spyOn(sharedApiClient, 'get').mockResolvedValue({
        id: 'usr-active',
        email: 'logged.in@playmatch.app',
        name: 'Active Player',
        role: 'player',
      });
    });

    it('redirects logged-in user visiting /login to /', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/login']}>
              <Routes>
                <Route path="/" element={<div data-testid="root-destination">Root Landing</div>} />
                <Route path="/login" element={<LoginPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('root-destination')).toBeDefined();
      });
    });

    it('redirects logged-in user visiting /register to /', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/register']}>
              <Routes>
                <Route path="/" element={<div data-testid="root-destination">Root Landing</div>} />
                <Route path="/register" element={<RegisterPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('root-destination')).toBeDefined();
      });
    });

    it('redirects logged-in user visiting /forgot-password to /', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/forgot-password']}>
              <Routes>
                <Route path="/" element={<div data-testid="root-destination">Root Landing</div>} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('root-destination')).toBeDefined();
      });
    });
  });
});
