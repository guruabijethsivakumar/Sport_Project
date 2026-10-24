import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterPage } from '../src/pages/auth/RegisterPage';
import { AuthProvider, sharedApiClient } from '../src/auth/AuthContext';
import { AUTH_MESSAGES } from '@playmatch/shared';

function renderRegisterPage(initialEntries = ['/register']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/onboarding" element={<div>Onboarding Destination</div>} />
            <Route path="/login" element={<div>Login Destination</div>} />
            <Route path="/" element={<div>Home Destination</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('RegisterPage Screen', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders registration form elements with accessible structure', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: AUTH_MESSAGES.registerTitle })).toBeDefined();
    expect(screen.getByPlaceholderText(AUTH_MESSAGES.namePlaceholder)).toBeDefined();
    expect(screen.getByPlaceholderText(AUTH_MESSAGES.emailPlaceholder)).toBeDefined();
    expect(screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder)).toBeDefined();
    expect(screen.getByPlaceholderText(AUTH_MESSAGES.confirmPasswordPlaceholder)).toBeDefined();
    expect(screen.getByRole('button', { name: AUTH_MESSAGES.signUpButton })).toBeDefined();
    expect(screen.getByRole('link', { name: AUTH_MESSAGES.signInLink })).toBeDefined();
  });

  it('shows inline validation errors when submitting with empty fields', async () => {
    renderRegisterPage();

    const submitBtn = screen.getByRole('button', { name: AUTH_MESSAGES.signUpButton });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeDefined();
      expect(screen.getByText('Email is required')).toBeDefined();
      expect(screen.getByText('Password must be at least 8 characters long')).toBeDefined();
    });
  });

  it('submits valid registration and redirects to /onboarding', async () => {
    const postSpy = vi.spyOn(sharedApiClient, 'post').mockResolvedValueOnce({
      user: { id: 'usr-1', email: 'alex@example.com', name: 'Alex Morgan' },
      accessToken: 'valid-test-access-token',
    } as any);

    renderRegisterPage();

    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.namePlaceholder), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.emailPlaceholder), {
      target: { value: 'alex@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.confirmPasswordPlaceholder), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: AUTH_MESSAGES.signUpButton }));

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/auth/register', {
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'Password123!',
      });
      expect(screen.getByText('Onboarding Destination')).toBeDefined();
    });
  });

  it('displays userAlreadyExists error banner when server returns 409', async () => {
    vi.spyOn(sharedApiClient, 'post').mockRejectedValueOnce({
      statusCode: 409,
      code: 'USER_ALREADY_EXISTS',
    });

    renderRegisterPage();

    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.namePlaceholder), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.emailPlaceholder), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(AUTH_MESSAGES.confirmPasswordPlaceholder), {
      target: { value: 'Password123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: AUTH_MESSAGES.signUpButton }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText(AUTH_MESSAGES.userAlreadyExists)).toBeDefined();
    });
  });

  it('toggles password visibility when eye button is clicked', () => {
    renderRegisterPage();

    const passwordInput = screen.getByPlaceholderText(AUTH_MESSAGES.passwordPlaceholder);
    expect(passwordInput.getAttribute('type')).toBe('password');

    const toggleBtns = screen.getAllByRole('button', { name: AUTH_MESSAGES.showPassword });
    fireEvent.click(toggleBtns[0]);

    expect(passwordInput.getAttribute('type')).toBe('text');
  });

  it('redirects authenticated user immediately away from /register', async () => {
    vi.spyOn(sharedApiClient, 'refreshSession').mockResolvedValueOnce('valid-token');
    vi.spyOn(sharedApiClient, 'get').mockResolvedValueOnce({
      id: 'usr-1',
      email: 'user@example.com',
      name: 'Existing User',
      role: 'player',
    });

    renderRegisterPage();

    await waitFor(() => {
      expect(screen.getByText('Home Destination')).toBeDefined();
    });
  });
});
