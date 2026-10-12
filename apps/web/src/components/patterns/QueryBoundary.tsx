import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/ErrorState';

export interface QueryBoundaryProps<T> {
  isLoading?: boolean;
  error?: Error | null;
  data?: T;
  isEmpty?: (data: T) => boolean;
  emptyState?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
}

export function QueryBoundary<T>({
  isLoading,
  error,
  data,
  isEmpty,
  emptyState,
  loadingFallback,
  onRetry,
  children,
}: QueryBoundaryProps<T>): React.ReactElement {
  if (isLoading) {
    if (loadingFallback) return <>{loadingFallback}</>;
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    const errorCode = (error as any)?.code || 'FETCH_ERROR';
    // User-facing friendly error text mapped from code (never raw backend stack/message)
    const friendlyMessage =
      errorCode === 'AUTH_UNAUTHORIZED'
        ? 'Please sign in to access this data.'
        : errorCode === 'FORBIDDEN_ACCESS'
        ? 'You do not have permission to view this.'
        : errorCode === 'RESOURCE_NOT_FOUND'
        ? 'The requested item was not found.'
        : 'An error occurred while loading this section.';

    return (
      <ErrorState
        errorCode={errorCode}
        message={friendlyMessage}
        onRetry={onRetry}
      />
    );
  }

  if (data !== undefined && isEmpty && isEmpty(data)) {
    return <>{emptyState}</>;
  }

  if (data !== undefined) {
    return <>{children(data)}</>;
  }

  return <>{emptyState}</>;
}
