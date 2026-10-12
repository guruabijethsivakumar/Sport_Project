import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '../src/pages/auth/LoginPage';
import { AuthProvider, sharedApiClient } from '../src/auth/AuthContext';
import { AUTH_MESSAGES } from '@playmatch/shared';

function renderLoginPage(initialEntries = ['/login']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard Destination</div>} />
            <Route path="/" element={<div>Home Destination</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('LoginPage Reference Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders login form elements with accessible structure and design system components', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: AUTH_MESSAGES.loginTitle })).toBeDefined();
    expect(screen.getByPlaceholderText(AUTH_MESSAGES.emailPlaceholder)).toBeDefined();
    expect(screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder)).toBeDefined();
    expect(screen.getByRole('button', { name: AUTH_MESSAGES.signInButton })).toBeDefined();
    expect(screen.getByRole('link', { name: AUTH_MESSAGES.forgotPasswordLink })).toBeDefined();
    expect(screen.getByRole('link', { name: AUTH_MESSAGES.signUpLink })).toBeDefined();
  });

  it('shows inline validation errors when submitting with empty or invalid fields', async () => {
    renderLoginPage();

    const submitBtn = screen.getByRole('button', { name: AUTH_MESSAGES.signInButton });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeDefined();
      expect(screen.getByText('Password is required')).toBeDefined();
    });
  });

  it('toggles password visibility between password and text input types', () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: AUTH_MESSAGES.showPassword });
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: AUTH_MESSAGES.hidePassword })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: AUTH_MESSAGES.hidePassword }));
    expect(passwordInput.type).toBe('password');
  });

  it('shows static generic error message on 401 without exposing server messages', async () => {
    vi.spyOn(sharedApiClient, 'post').mockRejectedValueOnce({
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Sensitive database/server internal message that should never be shown',
      failedLoginAttempts: 3,
    });

    renderLoginPage();

    const emailInput = screen.getByPlaceholderText(AUTH_MESSAGES.emailPlaceholder);
    const passwordInput = screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secretPassword1!' } });

    fireEvent.click(screen.getByRole('button', { name: AUTH_MESSAGES.signInButton }));

    await waitFor(() => {
      // Must display client generic error message
      const alertBanner = screen.getByRole('alert');
      expect(alertBanner).toBeDefined();
      expect(screen.getByText(AUTH_MESSAGES.invalidCredentials)).toBeDefined();
      // Accessibility requirement: Focus must move to the error banner upon failure
      expect(document.activeElement).toBe(alertBanner);
      // Must NOT leak backend message or details
      expect(screen.queryByText(/Sensitive database/i)).toBeNull();
      expect(screen.queryByText(/failedLoginAttempts/i)).toBeNull();
    });
  });

  it('redirects to safe destination upon successful login', async () => {
    vi.spyOn(sharedApiClient, 'post').mockResolvedValueOnce({
      user: { id: 'usr-1', email: 'user@example.com', name: 'Test User', role: 'player' },
      accessToken: 'valid-test-token',
    });

    renderLoginPage(['/login?redirect=/dashboard']);

    const emailInput = screen.getByPlaceholderText(AUTH_MESSAGES.emailPlaceholder);
    const passwordInput = screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secretPassword1!' } });

    fireEvent.click(screen.getByRole('button', { name: AUTH_MESSAGES.signInButton }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard Destination')).toBeDefined();
    });
  });

  it('neutralizes malicious open redirect attempts and defaults to safe home fallback', async () => {
    vi.spyOn(sharedApiClient, 'post').mockResolvedValueOnce({
      user: { id: 'usr-1', email: 'user@example.com', name: 'Test User', role: 'player' },
      accessToken: 'valid-test-token',
    });

    renderLoginPage(['/login?redirect=https://evil.com/phishing']);

    const emailInput = screen.getByPlaceholderText(AUTH_MESSAGES.emailPlaceholder);
    const passwordInput = screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secretPassword1!' } });

    fireEvent.click(screen.getByRole('button', { name: AUTH_MESSAGES.signInButton }));

    await waitFor(() => {
      expect(screen.getByText('Home Destination')).toBeDefined();
    });
  });

  it('redirects an already authenticated user away from /login immediately', async () => {
    vi.spyOn(sharedApiClient, 'refreshSession').mockResolvedValueOnce('valid-token');
    vi.spyOn(sharedApiClient, 'get').mockResolvedValueOnce({
      id: 'usr-1',
      email: 'user@example.com',
      name: 'Existing User',
      role: 'player',
    });

    renderLoginPage(['/login?redirect=/dashboard']);

    await waitFor(() => {
      expect(screen.getByText('Dashboard Destination')).toBeDefined();
    });
  });
});
