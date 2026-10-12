import React from 'react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface LoadMoreProps {
  onLoadMore: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  autoLoad?: boolean;
  className?: string;
  label?: string;
}

export function LoadMore({
  onLoadMore,
  isLoading = false,
  hasMore = true,
  autoLoad = false,
  className,
  label = 'Load more',
}: LoadMoreProps): React.ReactElement | null {
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!autoLoad || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    const el = triggerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [autoLoad, hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className={cn('flex justify-center py-6', className)}>
      <Button
        variant="outline"
        size="sm"
        isLoading={isLoading}
        onClick={onLoadMore}
        disabled={isLoading}
      >
        {label}
      </Button>
    </div>
  );
}
