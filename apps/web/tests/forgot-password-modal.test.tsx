import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordModal } from '../src/components/auth/ForgotPasswordModal';
import { ToastProvider } from '../src/components/ui/Toast';

const mockClient = {
  post: vi.fn(),
  getConfig: () => ({ pollingIntervalMs: 0 }),
};

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    client: mockClient,
  }),
}));

describe('ForgotPasswordModal Component Flow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.clearAllMocks();
  });

  it('renders modal with SMTP link request tab and handles reset link dispatch', async () => {
    mockClient.post.mockResolvedValueOnce({
      success: true,
      message: 'If the email exists, a password reset link has been dispatched.',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <ForgotPasswordModal
              isOpen={true}
              onClose={vi.fn()}
              initialEmail="player@example.com"
            />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Reset Password')).toBeDefined();
    expect(screen.getByText('1. Send Link via SMTP')).toBeDefined();
    expect(screen.getByText('2. Enter Token & Reset')).toBeDefined();

    const emailInput = screen.getByLabelText(/Account Email Address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('player@example.com');

    const sendBtn = screen.getByRole('button', { name: /Send Reset Link via SMTP/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'player@example.com',
      });
      expect(screen.getByText(/Reset Link Dispatched via SMTP/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /I Have a Reset Token/i })).toBeDefined();
    });
  });

  it('allows switching to Tab 2 to enter token and reset password directly', async () => {
    mockClient.post.mockResolvedValueOnce({
      success: true,
      message: 'Password reset successful',
    });

    const onResetSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <ForgotPasswordModal
              isOpen={true}
              onClose={onClose}
              onPasswordResetSuccess={onResetSuccess}
            />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    // Switch to Tab 2
    const tab2Btn = screen.getByText('2. Enter Token & Reset');
    fireEvent.click(tab2Btn);

    const tokenInput = screen.getByPlaceholderText(/Paste token from reset email/i);
    const passwordInput = screen.getByPlaceholderText(/Min. 8 characters/i);
    const confirmInput = screen.getByPlaceholderText(/Re-enter new password/i);

    fireEvent.change(tokenInput, { target: { value: 'tok-12345678' } });
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123!Secure' } });
    fireEvent.change(confirmInput, { target: { value: 'ValidPass123!Secure' } });

    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'tok-12345678',
        newPassword: 'ValidPass123!Secure',
      });
      expect(onResetSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
