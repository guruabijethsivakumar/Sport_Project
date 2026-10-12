import React from 'react';
import { cn } from '../../lib/utils';
import { Icon } from './Icon';

export interface StepItem {
  id: string | number;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  activeStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  activeStep,
  onStepClick,
  className,
}: StepperProps): React.ReactElement {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {idx > 0 && (
                <div
                  className={cn(
                    'absolute top-4 -left-1/2 w-full h-0.5 -z-0 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
              <button
                type="button"
                disabled={!onStepClick || (!isCompleted && !isCurrent)}
                onClick={() => onStepClick?.(idx)}
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'border-2 border-primary bg-card text-primary ring-2 ring-primary/20',
                  !isCompleted && !isCurrent && 'border border-border bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Icon name="check" size={14} /> : idx + 1}
              </button>
              <div className="mt-2 text-center">
                <span
                  className={cn(
                    'text-xs font-medium block',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
