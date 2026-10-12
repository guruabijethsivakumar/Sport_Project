import React from 'react';
import { cn } from '../../lib/utils';

export interface PageLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function PageLayout({
  children,
  breadcrumbs,
  className,
  maxWidth = 'xl',
}: PageLayoutProps): React.ReactElement {
  const maxWidthStyles = {
    sm: 'max-w-3xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl',
    '2xl': 'max-w-[1400px]',
    full: 'max-w-full',
  };

  return (
    <div className={cn('mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6', maxWidthStyles[maxWidth], className)}>
      {breadcrumbs && <div className="text-xs text-muted-foreground">{breadcrumbs}</div>}
      {children}
    </div>
  );
}
