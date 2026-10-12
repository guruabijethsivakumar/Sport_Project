import React from 'react';
import { cn } from '../../lib/utils';
import { Icon, type IconName } from './Icon';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  icon?: IconName;
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  trend,
  trendText,
  icon,
  className,
}: StatCardProps): React.ReactElement {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
            <Icon name={icon} size={18} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        {subValue && <span className="text-xs text-muted-foreground">{subValue}</span>}
      </div>
      {trendText && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend === 'up' && <Icon name="chevron-up" size={14} className="text-success" />}
          {trend === 'down' && <Icon name="chevron-down" size={14} className="text-danger" />}
          <span
            className={cn(
              'font-medium',
              trend === 'up' && 'text-success',
              trend === 'down' && 'text-danger',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            {trendText}
          </span>
        </div>
      )}
    </div>
  );
}
