import React, { createContext, useContext, useState, useCallback } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '../../lib/utils';
import { Icon, type IconName } from './Icon';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title: string; description?: string }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    ({ type = 'info', title, description }: { type?: ToastType; title: string; description?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, description }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastType, IconName> = {
    success: 'check-circle',
    danger: 'alert-circle',
    warning: 'alert-circle',
    info: 'info',
  };

  const borderStyles: Record<ToastType, string> = {
    success: 'border-success/30 bg-card text-foreground',
    danger: 'border-danger/30 bg-card text-foreground',
    warning: 'border-warning/30 bg-card text-foreground',
    info: 'border-info/30 bg-card text-foreground',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => {
          // Errors persist longer (8s vs 4s)
          const duration = t.type === 'danger' ? 8000 : 4000;
          return (
            <ToastPrimitive.Root
              key={t.id}
              duration={duration}
              onOpenChange={(open) => {
                if (!open) removeToast(t.id);
              }}
              className={cn(
                'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full sm:w-96',
                borderStyles[t.type]
              )}
            >
              <Icon
                name={icons[t.type]}
                className={cn(
                  'mt-0.5 shrink-0',
                  t.type === 'success' && 'text-success',
                  t.type === 'danger' && 'text-danger',
                  t.type === 'warning' && 'text-warning',
                  t.type === 'info' && 'text-info'
                )}
                size={18}
              />
              <div className="grid gap-1 flex-1">
                <ToastPrimitive.Title className="text-sm font-semibold leading-tight">
                  {t.title}
                </ToastPrimitive.Title>
                {t.description && (
                  <ToastPrimitive.Description className="text-xs text-muted-foreground leading-normal">
                    {t.description}
                  </ToastPrimitive.Description>
                )}
              </div>
              <ToastPrimitive.Close className="rounded p-1 text-muted-foreground opacity-60 hover:opacity-100 focus:outline-none">
                <Icon name="x" size={14} />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport
          aria-live="polite"
          className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-md sm:bottom-0 sm:right-0"
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
