import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResetPasswordPage } from '../src/pages/auth/ResetPasswordPage';

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

function renderResetPasswordPage(initialEntries = ['/reset-password?token=sample-valid-token']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>Login Page Target</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ResetPasswordPage Component Flow', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders form and allows setting new password when token is in URL query', async () => {
    mockClient.post.mockResolvedValueOnce({
      success: true,
      message: 'Password reset successful',
    });

    renderResetPasswordPage(['/reset-password?token=token-abc-123&email=iamhudson77@gmail.com']);

    expect(screen.getByText(/Resetting password for iamhudson77@gmail.com/i)).toBeDefined();

    const passwordInput = screen.getByPlaceholderText(/Enter new password/i);
    const confirmInput = screen.getByPlaceholderText(/Confirm new password/i);

    fireEvent.change(passwordInput, { target: { value: 'NewSuperPass2026!' } });
    fireEvent.change(confirmInput, { target: { value: 'NewSuperPass2026!' } });

    const submitBtn = screen.getByRole('button', { name: /Update password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'token-abc-123',
        newPassword: 'NewSuperPass2026!',
      });
      expect(screen.getByText(/Password successfully updated!/i)).toBeDefined();
    });
  });

  it('allows entering reset token manually when URL does not contain token parameter', async () => {
    mockClient.post.mockResolvedValueOnce({
      success: true,
      message: 'Password reset successful',
    });

    renderResetPasswordPage(['/reset-password']);

    const tokenInput = screen.getByPlaceholderText(/Paste token from reset email/i);
    const passwordInput = screen.getByPlaceholderText(/Enter new password/i);
    const confirmInput = screen.getByPlaceholderText(/Confirm new password/i);

    fireEvent.change(tokenInput, { target: { value: 'manual-token-999' } });
    fireEvent.change(passwordInput, { target: { value: 'ManualSecret123!' } });
    fireEvent.change(confirmInput, { target: { value: 'ManualSecret123!' } });

    const submitBtn = screen.getByRole('button', { name: /Update password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'manual-token-999',
        newPassword: 'ManualSecret123!',
      });
      expect(screen.getByText(/Password successfully updated!/i)).toBeDefined();
    });
  });

  it('rejects passwords that do not match client-side', async () => {
    renderResetPasswordPage(['/reset-password?token=tok-xyz']);

    const passwordInput = screen.getByPlaceholderText(/Enter new password/i);
    const confirmInput = screen.getByPlaceholderText(/Confirm new password/i);

    fireEvent.change(passwordInput, { target: { value: 'Secret123!Pass' } });
    fireEvent.change(confirmInput, { target: { value: 'Different123!Pass' } });

    const submitBtn = screen.getByRole('button', { name: /Update password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeDefined();
      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });
});
