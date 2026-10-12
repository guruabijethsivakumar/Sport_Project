import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { StatusPage } from './components/StatusPage';

describe('Web Application Smoke & Component Tests', () => {
  it('renders StatusPage header and foundation information', () => {
    const testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <StatusPage />
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('PlayMatch Web Shell')).toBeDefined();
    expect(screen.getByText(/Frontend foundation status and connectivity check/i)).toBeDefined();
    expect(screen.getByText(/Backend Health \(\/health\)/i)).toBeDefined();
    expect(screen.getByText(/Sports Catalog \(\/api\/v1\/sports\)/i)).toBeDefined();
  });
});
