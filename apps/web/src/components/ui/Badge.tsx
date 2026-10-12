import React from 'react';
import { cn } from '../../lib/utils';
import { Icon, type IconName } from './Icon';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'danger' | 'success' | 'warning' | 'info';
  icon?: IconName;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', icon, children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-muted text-foreground',
      outline: 'border border-border text-foreground',
      danger: 'bg-danger/15 text-danger border border-danger/30',
      success: 'bg-success/15 text-success border border-success/30',
      warning: 'bg-warning/15 text-warning border border-warning/30',
      info: 'bg-info/15 text-info border border-info/30',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon && <Icon name={icon} size={12} />}
        {children}
      </div>
    );
  }
);
Badge.displayName = 'Badge';

export type GameStatusType =
  | 'open'
  | 'full'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface StatusBadgeProps {
  status: GameStatusType;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  GameStatusType,
  { defaultLabel: string; icon: IconName; fgClass: string; bgClass: string }
> = {
  open: {
    defaultLabel: 'Open',
    icon: 'user-plus',
    fgClass: 'text-[var(--status-open-fg)]',
    bgClass: 'bg-[var(--status-open-bg)]',
  },
  full: {
    defaultLabel: 'Full / Waitlist',
    icon: 'users',
    fgClass: 'text-[var(--status-full-fg)]',
    bgClass: 'bg-[var(--status-full-bg)]',
  },
  confirmed: {
    defaultLabel: 'Confirmed',
    icon: 'check-circle',
    fgClass: 'text-[var(--status-confirmed-fg)]',
    bgClass: 'bg-[var(--status-confirmed-bg)]',
  },
  in_progress: {
    defaultLabel: 'In Progress',
    icon: 'play-circle',
    fgClass: 'text-[var(--status-in-progress-fg)]',
    bgClass: 'bg-[var(--status-in-progress-bg)]',
  },
  completed: {
    defaultLabel: 'Completed',
    icon: 'flag',
    fgClass: 'text-[var(--status-completed-fg)]',
    bgClass: 'bg-[var(--status-completed-bg)]',
  },
  cancelled: {
    defaultLabel: 'Cancelled',
    icon: 'x-circle',
    fgClass: 'text-[var(--status-cancelled-fg)]',
    bgClass: 'bg-[var(--status-cancelled-bg)]',
  },
  expired: {
    defaultLabel: 'Expired',
    icon: 'clock',
    fgClass: 'text-[var(--status-expired-fg)]',
    bgClass: 'bg-[var(--status-expired-bg)]',
  },
};

export function StatusBadge({
  status,
  label,
  className,
}: StatusBadgeProps): React.ReactElement {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const displayLabel = label || cfg.defaultLabel;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none',
        cfg.bgClass,
        cfg.fgClass,
        className
      )}
    >
      <Icon name={cfg.icon} size={12} />
      <span>{displayLabel}</span>
    </div>
  );
}

export type ConfidenceType = 'high' | 'medium' | 'low';

export interface ConfidenceBadgeProps {
  confidence: ConfidenceType;
  label?: string;
  className?: string;
}

const CONFIDENCE_CONFIG: Record<
  ConfidenceType,
  { defaultLabel: string; icon: IconName; fgClass: string; bgClass: string }
> = {
  high: {
    defaultLabel: 'High Confidence',
    icon: 'shield-check',
    fgClass: 'text-[var(--confidence-high-fg)]',
    bgClass: 'bg-[var(--confidence-high-bg)]',
  },
  medium: {
    defaultLabel: 'Moderate Fit',
    icon: 'shield-alert',
    fgClass: 'text-[var(--confidence-medium-fg)]',
    bgClass: 'bg-[var(--confidence-medium-bg)]',
  },
  low: {
    defaultLabel: 'Tentative Match',
    icon: 'help-circle',
    fgClass: 'text-[var(--confidence-low-fg)]',
    bgClass: 'bg-[var(--confidence-low-bg)]',
  },
};

export function ConfidenceBadge({
  confidence,
  label,
  className,
}: ConfidenceBadgeProps): React.ReactElement {
  const cfg = CONFIDENCE_CONFIG[confidence] || CONFIDENCE_CONFIG.high;
  const displayLabel = label || cfg.defaultLabel;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none',
        cfg.bgClass,
        cfg.fgClass,
        className
      )}
    >
      <Icon name={cfg.icon} size={12} />
      <span>{displayLabel}</span>
    </div>
  );
}
