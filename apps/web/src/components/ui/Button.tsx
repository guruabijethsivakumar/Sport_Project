import React from 'react';
import { cn } from '../../lib/utils';
import { Icon, type IconName } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary-hover active:opacity-90',
      secondary: 'bg-muted text-foreground hover:bg-border/20 active:opacity-90',
      outline: 'border border-border text-foreground hover:bg-muted active:opacity-90',
      ghost: 'text-foreground hover:bg-muted active:opacity-90',
      danger: 'bg-danger text-danger-foreground hover:bg-danger-hover active:opacity-90',
      success: 'bg-success text-success-foreground hover:bg-success-hover active:opacity-90',
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <Icon name="spinner" className="animate-spin" size={size === 'sm' ? 14 : 16} />
        ) : leftIcon ? (
          <Icon name={leftIcon} size={size === 'sm' ? 14 : 16} />
        ) : null}
        {children}
        {!isLoading && rightIcon && (
          <Icon name={rightIcon} size={size === 'sm' ? 14 : 16} />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
