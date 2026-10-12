import React from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  errorCode,
  onRetry,
  className,
}: ErrorStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger/5 p-8 text-center select-none',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger mb-3">
        <Icon name="alert-circle" size={24} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{message}</p>
      {errorCode && (
        <span className="mt-2 rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {errorCode}
        </span>
      )}
      {onRetry && (
        <div className="mt-5">
          <Button onClick={onRetry} variant="outline" size="sm" leftIcon="refresh">
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
