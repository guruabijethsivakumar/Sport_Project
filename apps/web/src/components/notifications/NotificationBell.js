import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell } from 'lucide-react';
import { useNotifications } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
export function NotificationBell({ unreadCount: passedUnreadCount, onClick, isOpen = false, className = '', }) {
    const { client, isAuthenticated } = useAuth();
    // If unreadCount is not passed as prop, fetch from shared notifications hook
    const { data } = useNotifications(client, {
        enabled: passedUnreadCount === undefined && isAuthenticated,
        refetchInterval: 15000, // Background poll every 15s if sockets aren't active
    });
    const count = passedUnreadCount !== undefined ? passedUnreadCount : data?.unreadCount || 0;
    const hasUnread = count > 0;
    const displayCount = count > 99 ? '99+' : count;
    return (_jsxs("button", { type: "button", onClick: onClick, "aria-label": `Notifications${hasUnread ? `, ${count} unread` : ''}`, "aria-expanded": isOpen, className: `group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isOpen
            ? 'bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'} ${className}`, children: [_jsx(Bell, { className: `h-5 w-5 transition-transform duration-200 ${hasUnread ? 'group-hover:rotate-12' : ''}` }), hasUnread && (_jsxs("span", { className: "absolute -top-1 -right-1 flex items-center justify-center", children: [_jsx("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" }), _jsx("span", { className: "relative inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black tabular-nums leading-none text-white shadow-xs ring-2 ring-white dark:ring-slate-900", children: displayCount })] }))] }));
}
