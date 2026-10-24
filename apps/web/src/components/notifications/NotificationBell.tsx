import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';

export interface NotificationBellProps {
  unreadCount?: number;
  onClick?: () => void;
  isOpen?: boolean;
  className?: string;
}

export function NotificationBell({
  unreadCount: passedUnreadCount,
  onClick,
  isOpen = false,
  className = '',
}: NotificationBellProps) {
  const { client, isAuthenticated } = useAuth();

  // If unreadCount is not passed as prop, fetch from shared notifications hook
  const { data } = useNotifications(client, {
    enabled: passedUnreadCount === undefined && isAuthenticated,
    refetchInterval: 15000, // Background poll every 15s if sockets aren't active
  });

  const count = passedUnreadCount !== undefined ? passedUnreadCount : data?.unreadCount || 0;
  const hasUnread = count > 0;
  const displayCount = count > 99 ? '99+' : count;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Notifications${hasUnread ? `, ${count} unread` : ''}`}
      aria-expanded={isOpen}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isOpen
          ? 'bg-muted text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      } ${className}`}
    >
      {/* Bell Icon */}
      <Bell
        className={`h-5 w-5 transition-transform duration-200 ${
          hasUnread ? 'group-hover:rotate-12' : ''
        }`}
      />

      {/* Dynamic Red Unread Badge */}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center">
          {/* Subtle animated pulsing ping effect */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />

          {/* Badge Counter */}
          <span className="relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-black tabular-nums leading-none text-danger-foreground shadow-xs ring-2 ring-card">
            {displayCount}
          </span>
        </span>
      )}
    </button>
  );
}
