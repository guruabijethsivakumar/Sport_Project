import React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '../../lib/utils';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  options: RadioOption[];
  className?: string;
}

export function RadioGroup({
  value,
  onValueChange,
  defaultValue,
  disabled,
  options,
  className,
}: RadioGroupProps): React.ReactElement {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      disabled={disabled}
      className={cn('grid gap-3', className)}
    >
      {options.map((opt) => (
        <div key={opt.value} className="flex items-start gap-2.5">
          <RadioGroupPrimitive.Item
            id={`radio-${opt.value}`}
            value={opt.value}
            className="aspect-square h-4 w-4 rounded-full border border-border text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary"
          >
            <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </RadioGroupPrimitive.Indicator>
          </RadioGroupPrimitive.Item>
          <div className="grid gap-0.5 leading-none">
            <label
              htmlFor={`radio-${opt.value}`}
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              {opt.label}
            </label>
            {opt.description && (
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            )}
          </div>
        </div>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
