import React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tags?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  tags,
  className,
}: PageHeaderProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-border-subtle/40', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {tags && <div className="flex items-center gap-1.5">{tags}</div>}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
