import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ForgotPasswordPage } from '../src/pages/auth/ForgotPasswordPage';
import { AuthProvider, sharedApiClient } from '../src/auth/AuthContext';
import { AUTH_MESSAGES } from '@playmatch/shared';

function renderForgotPasswordPage(initialEntries = ['/forgot-password']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/login" element={<div>Login Screen Destination</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('ForgotPasswordPage Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders forgot password form elements with accessible structure and back to login link', () => {
    renderForgotPasswordPage();

    expect(screen.getByRole('heading', { name: AUTH_MESSAGES.forgotPasswordTitle })).toBeDefined();
    expect(screen.getByText(AUTH_MESSAGES.forgotPasswordSubtitle)).toBeDefined();
    expect(screen.getByLabelText(/Email address/i)).toBeDefined();
    expect(screen.getByRole('button', { name: AUTH_MESSAGES.sendResetLinkButton })).toBeDefined();

    const backLink = screen.getByRole('link', { name: AUTH_MESSAGES.backToLoginLink });
    expect(backLink).toBeDefined();
    expect(backLink.getAttribute('href')).toBe('/login');
  });

  it('validates invalid email format client-side before sending', async () => {
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/Email address/i);
    const submitBtn = screen.getByRole('button', { name: AUTH_MESSAGES.sendResetLinkButton });

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeDefined();
    });
  });

  it('submits valid email and renders generic success message regardless of user existence', async () => {
    const postSpy = vi.spyOn(sharedApiClient, 'post').mockResolvedValue({ message: 'dispatched' } as any);

    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/Email address/i);
    const submitBtn = screen.getByRole('button', { name: AUTH_MESSAGES.sendResetLinkButton });

    fireEvent.change(emailInput, { target: { value: 'player@example.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'player@example.com',
      });
      expect(screen.getByRole('heading', { name: AUTH_MESSAGES.resetLinkSentTitle })).toBeDefined();
      expect(screen.getByText(AUTH_MESSAGES.resetLinkSentMessage)).toBeDefined();
      expect(screen.getByText(/player@example.com/i)).toBeDefined();
    });
  });

  it('suppresses backend errors and still shows generic success message to prevent user enumeration', async () => {
    // Simulate backend throwing 404 (user not found) or 500
    vi.spyOn(sharedApiClient, 'post').mockRejectedValue(new Error('User not found'));

    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/Email address/i);
    const submitBtn = screen.getByRole('button', { name: AUTH_MESSAGES.sendResetLinkButton });

    fireEvent.change(emailInput, { target: { value: 'unknown@example.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Must show the exact generic success message, never leaking "User not found"
      expect(screen.queryByText(/User not found/i)).toBeNull();
      expect(screen.getByText(AUTH_MESSAGES.resetLinkSentMessage)).toBeDefined();
    });
  });

  it('allows user to click "Try another email" to return to the reset form', async () => {
    vi.spyOn(sharedApiClient, 'post').mockResolvedValue({} as any);

    renderForgotPasswordPage();

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button', { name: AUTH_MESSAGES.sendResetLinkButton }));

    await waitFor(() => {
      expect(screen.getByText(AUTH_MESSAGES.resetLinkSentMessage)).toBeDefined();
    });

    const tryAgainBtn = screen.getByRole('button', { name: /Try another email/i });
    fireEvent.click(tryAgainBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: AUTH_MESSAGES.forgotPasswordTitle })).toBeDefined();
      expect(screen.getByLabelText(/Email address/i)).toBeDefined();
    });
  });
});
