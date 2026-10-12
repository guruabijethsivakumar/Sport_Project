import React from 'react';
import { cn } from '../../lib/utils';

export interface FormFieldProps {
  id?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  error,
  helperText,
  required,
  className,
  children,
}: FormFieldProps): React.ReactElement {
  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-foreground flex items-center gap-1"
        >
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={id ? `${id}-desc` : undefined} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
