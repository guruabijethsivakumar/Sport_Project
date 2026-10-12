import React from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

export interface DemoBadgeProps {
  isMock?: boolean;
  tooltipText?: string;
  className?: string;
}

export function DemoBadge({
  isMock = true,
  tooltipText = 'This data is simulated locally via mock fixtures.',
  className,
}: DemoBadgeProps): React.ReactElement | null {
  if (!isMock) return null;

  return (
    <Tooltip content={tooltipText}>
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-warning select-none cursor-help',
          className
        )}
      >
        <Icon name="sparkles" size={10} />
        <span>Demo Data</span>
      </div>
    </Tooltip>
  );
}
