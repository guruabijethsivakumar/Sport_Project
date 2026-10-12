import React from 'react';
import { type UseFormSetError, type FieldValues, type Path } from 'react-hook-form';
import { Icon } from '../ui/Icon';

export interface FormErrorBannerProps {
  error?: string | null;
  onDismiss?: () => void;
}

export const FormErrorBanner = React.forwardRef<HTMLDivElement, FormErrorBannerProps>(
  ({ error, onDismiss }, ref) => {
    if (!error) return null;

    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={-1}
        className="flex items-center justify-between rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger mb-4 outline-none focus:ring-2 focus:ring-danger"
      >
        <div className="flex items-center gap-2">
          <Icon name="alert-circle" size={16} />
          <span>{error}</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded p-1 opacity-70 hover:opacity-100 focus:outline-none"
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
    );
  }
);
FormErrorBanner.displayName = 'FormErrorBanner';

/**
 * Maps backend API error envelopes to React Hook Form field errors
 */
export function mapBackendErrorsToForm<T extends FieldValues>(
  err: any,
  setError: UseFormSetError<T>,
  setTopLevelError?: (msg: string) => void
): void {
  if (err?.details && Array.isArray(err.details)) {
    for (const detail of err.details) {
      if (detail.field) {
        setError(detail.field as Path<T>, {
          type: 'server',
          message: detail.message,
        });
      }
    }
  }

  if (setTopLevelError) {
    const code = err?.code || 'OPERATION_FAILED';
    const message = err?.message || 'An unexpected error occurred. Please try again.';
    setTopLevelError(`${message} (${code})`);
  }
}
