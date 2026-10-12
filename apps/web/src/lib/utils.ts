import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'text-color': [
        'text-foreground',
        'text-muted-foreground',
        'text-placeholder',
        'text-primary',
        'text-primary-foreground',
        'text-success',
        'text-danger',
        'text-warning',
        'text-info',
      ],
      'bg-color': [
        'bg-bg',
        'bg-card',
        'bg-muted',
        'bg-primary',
        'bg-primary-hover',
        'bg-success',
        'bg-danger',
        'bg-warning',
        'bg-info',
      ],
      'border-color': [
        'border-border',
        'border-border-subtle',
        'border-primary',
        'border-danger',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return customTwMerge(clsx(inputs));
}
