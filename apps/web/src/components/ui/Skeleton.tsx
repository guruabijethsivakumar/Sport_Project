import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: 'rectangle' | 'circle' | 'pill';
}

export function Skeleton({
  className,
  shape = 'rectangle',
  ...props
}: SkeletonProps): React.ReactElement {
  const shapeStyles = {
    rectangle: 'rounded-md',
    circle: 'rounded-full aspect-square',
    pill: 'rounded-full',
  };

  return (
    <div
      className={cn('animate-pulse bg-muted/80', shapeStyles[shape], className)}
      {...props}
    />
  );
}
