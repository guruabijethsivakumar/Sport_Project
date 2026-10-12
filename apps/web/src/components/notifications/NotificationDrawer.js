import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, CheckCheck, Clock, Trophy, Calendar, AlertTriangle, TrendingUp, Users, ChevronRight, Inbox, } from 'lucide-react';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
// ─── Format Relative Time Helper ─────────────────────────────────────────────
function formatRelativeTime(isoString) {
    try {
        const diffMs = Date.now() - new Date(isoString).getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        if (diffSec < 60)
            return 'Just now';
        if (diffMin < 60)
            return `${diffMin}m ago`;
        if (diffHour < 24)
            return `${diffHour}h ago`;
        if (diffDay < 7)
            return `${diffDay}d ago`;
        return new Date(isoString).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
        });
    }
    catch {
        return 'Recently';
    }
}
// ─── Notification Type Icon & Color Map ──────────────────────────────────────
function getNotificationTypeMeta(type) {
    switch (type) {
        case 'game_invitation':
            return {
                icon: Users,
                colorClass: 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400',
                ringClass: 'ring-indigo-500/20',
            };
        case 'game_confirmed':
            return {
                icon: Calendar,
                colorClass: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
                ringClass: 'ring-emerald-500/20',
            };
        case 'game_cancelled':
            return {
                icon: AlertTriangle,
                colorClass: 'text-rose-600 bg-rose-500/10 dark:text-rose-400',
                ringClass: 'ring-rose-500/20',
            };
        case 'result_submitted':
            return {
                icon: Trophy,
                colorClass: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
                ringClass: 'ring-amber-500/20',
            };
        case 'rating_updated':
            return {
                icon: TrendingUp,
                colorClass: 'text-blue-600 bg-blue-500/10 dark:text-blue-400',
                ringClass: 'ring-blue-500/20',
            };
        default:
            return {
                icon: Bell,
                colorClass: 'text-slate-600 bg-slate-500/10 dark:text-slate-400',
                ringClass: 'ring-slate-500/20',
            };
    }
}
export function NotificationDrawer({ isOpen, onClose, onNotificationClick, className = '', }) {
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
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    if (!isOpen)
        return null;
    const handleItemClick = async (notif) => {
        // 1. Mark as read if currently unread
        if (!notif.read) {
            try {
                await markReadMutation.mutateAsync(notif.id);
            }
            catch {
                // Continue navigation regardless
            }
        }
        // 2. Custom callback if provided
        if (onNotificationClick) {
            onNotificationClick(notif);
            return;
        }
        // 3. Built-in deep-linking logic for game-related notifications
        const gameId = notif.data?.gameId;
        if (gameId) {
            navigate(`/games/${gameId}`);
            onClose();
        }
    };
    const handleMarkAsRead = async (e, notifId) => {
        e.stopPropagation();
        try {
            await markReadMutation.mutateAsync(notifId);
        }
        catch {
            // Handled by query invalidation
        }
    };
    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0 || markAllMutation.isPending)
            return;
        try {
            await markAllMutation.mutateAsync();
        }
        catch {
            // Handled by mutation hook
        }
    };
    return (_jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": "Notification Center", className: "fixed inset-0 z-50 overflow-hidden", children: [_jsx("div", { className: "fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity", onClick: onClose }), _jsx("div", { className: "fixed inset-y-0 right-0 flex max-w-full pl-10", children: _jsxs("aside", { className: `flex w-screen max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 ${className}`, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400", children: _jsx(Bell, { className: "h-4.5 w-4.5" }) }), _jsx("div", { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-base font-bold text-slate-900 dark:text-slate-50", children: "Notifications" }), unreadCount > 0 && (_jsxs("span", { className: "rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-600 ring-1 ring-inset ring-blue-500/20 dark:text-blue-400", children: [unreadCount, " unread"] }))] }) })] }), _jsxs("div", { className: "flex items-center gap-1", children: [unreadCount > 0 && (_jsxs("button", { type: "button", onClick: handleMarkAllAsRead, disabled: markAllMutation.isPending, className: "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50", title: "Mark all as read", children: [_jsx(CheckCheck, { className: "h-3.5 w-3.5" }), _jsx("span", { children: "Mark all" })] })), _jsx("button", { type: "button", onClick: onClose, "aria-label": "Close notifications", className: "rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200", children: _jsx(X, { className: "h-5 w-5" }) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60", children: isLoading ? (_jsx(DrawerSkeleton, {})) : notifications.length === 0 ? (_jsx(EmptyNotificationsView, {})) : (notifications.map((item) => {
                                const meta = getNotificationTypeMeta(item.type);
                                const IconComponent = meta.icon;
                                const isGameRelated = Boolean(item.data?.gameId);
                                return (_jsxs("div", { onClick: () => handleItemClick(item), role: "button", tabIndex: 0, onKeyDown: (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleItemClick(item);
                                        }
                                    }, className: `group relative flex items-start gap-3.5 p-4.5 transition-colors cursor-pointer ${item.read
                                        ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                        : 'bg-blue-50/30 hover:bg-blue-50/60 dark:bg-blue-950/20 dark:hover:bg-blue-950/30'}`, children: [_jsx("div", { className: `flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${meta.colorClass} ${meta.ringClass}`, children: _jsx(IconComponent, { className: "h-4.5 w-4.5" }) }), _jsxs("div", { className: "flex-1 min-w-0 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("h4", { className: `text-xs font-bold truncate ${item.read
                                                                ? 'text-slate-700 dark:text-slate-300'
                                                                : 'text-slate-900 dark:text-slate-50'}`, children: item.title }), _jsxs("span", { className: "flex-shrink-0 text-[10px] text-slate-400 flex items-center gap-1", children: [_jsx(Clock, { className: "h-2.5 w-2.5" }), formatRelativeTime(item.createdAt)] })] }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed", children: item.message }), isGameRelated && (_jsxs("div", { className: "pt-1 flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline", children: [_jsx("span", { children: "View match details" }), _jsx(ChevronRight, { className: "h-3 w-3" })] }))] }), _jsx("div", { className: "flex flex-col items-center gap-2 self-center", children: !item.read && (_jsxs(_Fragment, { children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400", title: "Unread" }), _jsx("button", { type: "button", onClick: (e) => handleMarkAsRead(e, item.id), title: "Mark as read", "aria-label": "Mark notification as read", className: "rounded-md p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-200", children: _jsx(Check, { className: "h-3.5 w-3.5" }) })] })) })] }, item.id));
                            })) }), _jsx("div", { className: "border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/60", children: _jsxs("div", { className: "flex items-center justify-between text-xs text-slate-500 dark:text-slate-400", children: [_jsxs("span", { children: [notifications.length, " total notifications"] }), _jsx("button", { type: "button", onClick: () => refetch(), className: "font-semibold text-blue-600 hover:underline dark:text-blue-400", children: "Refresh" })] }) })] }) })] }));
}
// ─── Empty Notifications State ───────────────────────────────────────────────
function EmptyNotificationsView() {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 px-6 text-center", children: [_jsx("div", { className: "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500", children: _jsx(Inbox, { className: "h-7 w-7" }) }), _jsx("h3", { className: "text-sm font-bold text-slate-800 dark:text-slate-200", children: "All caught up!" }), _jsx("p", { className: "mt-1 max-w-xs text-xs text-slate-400", children: "You have no new notifications. Game invites, score submissions, and rating updates will appear here." })] }));
}
// ─── Loading Skeleton Rows ───────────────────────────────────────────────────
function DrawerSkeleton() {
    return (_jsx("div", { className: "divide-y divide-slate-100 p-2 dark:divide-slate-800", children: [1, 2, 3, 4].map((n) => (_jsxs("div", { className: "flex items-start gap-3 p-4 animate-pulse", children: [_jsx("div", { className: "h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" }), _jsx("div", { className: "h-3 w-48 rounded bg-slate-100 dark:bg-slate-800/60" })] })] }, n))) }));
}
