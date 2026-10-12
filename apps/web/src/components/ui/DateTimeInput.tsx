import React from 'react';
import { cn } from '../../lib/utils';

export interface DateTimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: 'date' | 'time' | 'datetime-local';
  isError?: boolean;
  timeZoneLabel?: string;
}

export const DateTimeInput = React.forwardRef<HTMLInputElement, DateTimeInputProps>(
  ({ className, type = 'date', isError, timeZoneLabel, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            isError ? 'border-danger focus-visible:ring-danger' : 'border-border',
            timeZoneLabel ? 'pr-20' : '',
            className
          )}
          {...props}
        />
        {timeZoneLabel && (
          <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none select-none">
            {timeZoneLabel}
          </span>
        )}
      </div>
    );
  }
);

DateTimeInput.displayName = 'DateTimeInput';
