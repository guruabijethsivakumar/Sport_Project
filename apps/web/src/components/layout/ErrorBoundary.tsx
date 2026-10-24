import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress console crash in production / test
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <Icon name="alert-circle" size={28} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            An unexpected error occurred while rendering this page. You can reload or return to the home page.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <Icon name="refresh" size={16} className="mr-2" />
              Reload Page
            </Button>
            <Button
              variant="primary"
              onClick={this.handleReset}
            >
              Return Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
