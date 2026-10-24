import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Clock,
  Trophy,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
  ChevronRight,
  Inbox,
  Loader2,
} from 'lucide-react';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@playmatch/shared';
import type { NotificationItem } from '@playmatch/shared/features/notifications';
import { useAuth } from '../../auth/AuthContext';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: NotificationItem) => void;
  className?: string;
}

// ─── Format Relative Time Helper ─────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return new Date(isoString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

// ─── Notification Type Icon & Color Map ──────────────────────────────────────

function getNotificationTypeMeta(type: NotificationItem['type']) {
  switch (type) {
    case 'game_invitation':
      return {
        icon: Users,
        colorClass: 'text-info bg-info/10',
        ringClass: 'ring-info/20',
      };
    case 'game_confirmed':
      return {
        icon: Calendar,
        colorClass: 'text-success bg-success/10',
        ringClass: 'ring-success/20',
      };
    case 'game_cancelled':
      return {
        icon: AlertTriangle,
        colorClass: 'text-danger bg-danger/10',
        ringClass: 'ring-danger/20',
      };
    case 'result_submitted':
      return {
        icon: Trophy,
        colorClass: 'text-warning bg-warning/10',
        ringClass: 'ring-warning/20',
      };
    case 'rating_updated':
      return {
        icon: TrendingUp,
        colorClass: 'text-primary bg-primary/10',
        ringClass: 'ring-primary/20',
      };
    default:
      return {
        icon: Bell,
        colorClass: 'text-muted-foreground bg-muted',
        ringClass: 'ring-border',
      };
  }
}

export function NotificationDrawer({
  isOpen,
  onClose,
  onNotificationClick,
  className = '',
}: NotificationDrawerProps) {
  const { client } = useAuth();
  const navigate = useNavigate();

  // Queries & Mutations
  const { data, isLoading, refetch } = useNotifications(client, {
    enabled: isOpen,
  });

  const markReadMutation = useMarkNotificationAsRead(client);
  const markAllMutation = useMarkAllNotificationsAsRead(client);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = async (notif: NotificationItem) => {
    // 1. Mark as read if currently unread
    if (!notif.read) {
      try {
        await markReadMutation.mutateAsync(notif.id);
      } catch {
        // Continue navigation regardless
      }
    }

    // 2. Custom callback if provided
    if (onNotificationClick) {
      onNotificationClick(notif);
      return;
    }

    // 3. Built-in deep-linking logic for game-related notifications
    const gameId = notif.data?.gameId as string | undefined;
    if (gameId) {
      navigate(`/games/${gameId}`);
      onClose();
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    try {
      await markReadMutation.mutateAsync(notifId);
    } catch {
      // Handled by query invalidation
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markAllMutation.isPending) return;
    try {
      await markAllMutation.mutateAsync();
    } catch {
      // Handled by mutation hook
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          className={`flex w-screen max-w-md flex-col border-l border-border bg-card text-foreground shadow-2xl transition-transform duration-300 ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-5 bg-card">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary ring-1 ring-inset ring-primary/20">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close notifications"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body: Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <DrawerSkeleton />
            ) : notifications.length === 0 ? (
              <EmptyNotificationsView />
            ) : (
              notifications.map((item) => {
                const meta = getNotificationTypeMeta(item.type);
                const IconComponent = meta.icon;
                const isGameRelated = Boolean(item.data?.gameId);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemClick(item);
                      }
                    }}
                    className={`group relative flex items-start gap-3.5 p-4 transition-colors cursor-pointer ${
                      item.read
                        ? 'hover:bg-muted/50'
                        : 'bg-primary/5 hover:bg-primary/10'
                    }`}
                  >
                    {/* Left Icon */}
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${meta.colorClass} ${meta.ringClass}`}
                    >
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>

                    {/* Middle: Title, message, timestamp */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-xs font-bold truncate ${
                            item.read
                              ? 'text-muted-foreground'
                              : 'text-foreground'
                          }`}
                        >
                          {item.title}
                        </h4>
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Deep-link action hint for game events */}
                      {isGameRelated && (
                        <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                          <span>View match details</span>
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Right: Unread Indicator & Mark Read Button */}
                    <div className="flex flex-col items-center gap-2 self-center">
                      {!item.read && (
                        <>
                          {/* Unread dot */}
                          <span
                            className="h-2 w-2 rounded-full bg-primary"
                            title="Unread"
                          />
                          {/* Quick mark read button */}
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(e, item.id)}
                            title="Mark as read"
                            aria-label="Mark notification as read"
                            className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{notifications.length} total notifications</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="font-semibold text-primary hover:underline transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Empty Notifications State ───────────────────────────────────────────────

function EmptyNotificationsView() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox className="h-7 w-7" />
      </div>
      <h3 className="text-sm font-bold text-foreground">
        All caught up!
      </h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        You have no new notifications. Game invites, score submissions, and rating updates will
        appear here.
      </p>
    </div>
  );
}

// ─── Loading Skeleton Rows ───────────────────────────────────────────────────

function DrawerSkeleton() {
  return (
    <div className="divide-y divide-border p-2">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-start gap-3 p-4 animate-pulse">
          <div className="h-9 w-9 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
