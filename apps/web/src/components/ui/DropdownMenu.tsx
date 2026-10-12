import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';
import { Icon, type IconName } from './Icon';

export interface DropdownMenuItemDef {
  key: string;
  label: string;
  icon?: IconName;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: (DropdownMenuItemDef | 'separator')[];
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = 'end',
  className,
}: DropdownMenuProps): React.ReactElement {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>{trigger}</DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={4}
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-card p-1 text-foreground shadow-md',
            className
          )}
        >
          {items.map((item, index) => {
            if (item === 'separator') {
              return (
                <DropdownMenuPrimitive.Separator
                  key={`sep-${index}`}
                  className="-mx-1 my-1 h-px bg-border-subtle/50"
                />
              );
            }
            return (
              <DropdownMenuPrimitive.Item
                key={item.key}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  item.destructive && 'text-danger focus:bg-danger/10 focus:text-danger'
                )}
              >
                {item.icon && <Icon name={item.icon} size={14} />}
                <span>{item.label}</span>
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
