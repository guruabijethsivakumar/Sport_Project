import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function validateNextPath(path: string | null | undefined): string | null {
  if (!path) return null;
  try {
    const decoded = decodeURIComponent(path).trim();
    // Must start with a single slash and not '//' to prevent protocol-relative open redirects
    if (!decoded.startsWith('/') || decoded.startsWith('//')) {
      return null;
    }
    // Disallow auth routes to prevent redirect loops
    const lower = decoded.toLowerCase();
    if (
      lower.startsWith('/login') ||
      lower.startsWith('/register') ||
      lower.startsWith('/forgot-password') ||
      lower.startsWith('/logout')
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="mx-auto max-w-4xl p-6 space-y-6"
        role="status"
        aria-label="Loading protected content"
      >
        <div className="flex items-center space-x-4">
          <Skeleton shape="circle" className="h-12 w-12" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
        <div className="space-y-3 pt-4">
          <Skeleton className="h-8 w-2/5" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const fullPath = location.pathname + location.search;
    const validatedNext = validateNextPath(fullPath);
    const destination = validatedNext
      ? `${redirectTo}?next=${encodeURIComponent(validatedNext)}`
      : redirectTo;

    return (
      <Navigate
        to={destination}
        state={validatedNext ? { from: location } : undefined}
        replace
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
