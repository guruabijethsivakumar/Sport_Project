import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Trophy, TrendingUp, TrendingDown, Minus, CheckCircle2, Calendar, MapPin, ChevronRight, Shield, } from 'lucide-react';
export function ResultHistoryCard({ gameId, sportKey = 'match', gameTitle, date, venueName, sideAName = 'Side A', sideBName = 'Side B', sideAScore, sideBScore, userSide = 'side_a', eloDelta, userRatingAfter, status = 'verified', notes, onClick, className = '', }) {
    const isPositiveElo = eloDelta > 0;
    const isNegativeElo = eloDelta < 0;
    const isZeroElo = eloDelta === 0;
    const isAWinner = sideAScore > sideBScore;
    const isBWinner = sideBScore > sideAScore;
    const userWon = (userSide === 'side_a' && isAWinner) || (userSide === 'side_b' && isBWinner);
    // Format date string
    const formattedDate = date
        ? typeof date === 'string'
            ? new Date(date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
            : date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
        : null;
    return (_jsxs("div", { onClick: onClick, role: onClick ? 'button' : undefined, tabIndex: onClick ? 0 : undefined, onKeyDown: (e) => {
            if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onClick();
            }
        }, className: `group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/80 ${onClick
            ? 'cursor-pointer hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700'
            : ''} ${className}`, children: [_jsxs("div", { className: "mb-3.5 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [sportKey && (_jsx("span", { className: "rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300", children: sportKey })), gameTitle && (_jsx("span", { className: "text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px] sm:max-w-[200px]", children: gameTitle })), formattedDate && (_jsxs("span", { className: "flex items-center gap-1 text-[11px] text-slate-400", children: [_jsx(Calendar, { className: "h-3 w-3" }), formattedDate] }))] }), _jsx("div", { className: "flex items-center gap-1.5", children: status === 'verified' ? (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), "Verified"] })) : status === 'resolved' ? (_jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-500/20 dark:text-blue-400", children: "Resolved" })) : status === 'disputed' ? (_jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400", children: "Disputed" })) : (_jsx("span", { className: "inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/20", children: status })) })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800/80 dark:bg-slate-800/40", children: [_jsxs("div", { className: "flex flex-1 items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [_jsx(Shield, { className: "h-3.5 w-3.5 flex-shrink-0 text-blue-500" }), _jsx("span", { className: `text-xs font-bold truncate ${isAWinner
                                            ? 'text-slate-900 dark:text-slate-100'
                                            : 'text-slate-600 dark:text-slate-400'}`, children: sideAName }), userSide === 'side_a' && (_jsx("span", { className: "rounded bg-blue-500/10 px-1 py-0.2 text-[9px] font-extrabold uppercase text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400", children: "You" }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: `text-lg font-black tabular-nums ${isAWinner
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-slate-700 dark:text-slate-300'}`, children: sideAScore }), isAWinner && _jsx(Trophy, { className: "h-3.5 w-3.5 text-amber-500" })] })] }), _jsx("div", { className: "text-xs font-bold text-slate-300 dark:text-slate-600", children: "vs" }), _jsxs("div", { className: "flex flex-1 items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-1", children: [isBWinner && _jsx(Trophy, { className: "h-3.5 w-3.5 text-amber-500" }), _jsx("span", { className: `text-lg font-black tabular-nums ${isBWinner
                                            ? 'text-purple-600 dark:text-purple-400'
                                            : 'text-slate-700 dark:text-slate-300'}`, children: sideBScore })] }), _jsxs("div", { className: "flex items-center justify-end gap-1.5 min-w-0 text-right", children: [userSide === 'side_b' && (_jsx("span", { className: "rounded bg-purple-500/10 px-1 py-0.2 text-[9px] font-extrabold uppercase text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-400", children: "You" })), _jsx("span", { className: `text-xs font-bold truncate ${isBWinner
                                            ? 'text-slate-900 dark:text-slate-100'
                                            : 'text-slate-600 dark:text-slate-400'}`, children: sideBName }), _jsx(Shield, { className: "h-3.5 w-3.5 flex-shrink-0 text-purple-500" })] })] })] }), _jsxs("div", { className: "mt-3.5 flex items-center justify-between text-xs", children: [_jsx("div", { className: "flex items-center gap-2 text-slate-500 dark:text-slate-400", children: venueName ? (_jsxs("span", { className: "flex items-center gap-1 text-[11px] truncate max-w-[160px]", children: [_jsx(MapPin, { className: "h-3 w-3 flex-shrink-0 text-slate-400" }), venueName] })) : (_jsx("span", { className: "text-[11px] font-medium text-slate-500", children: userWon ? 'Victory' : isAWinner === isBWinner ? 'Draw' : 'Defeat' })) }), _jsxs("div", { className: "flex items-center gap-2", children: [userRatingAfter !== undefined && (_jsxs("span", { className: "text-[11px] font-medium text-slate-400 dark:text-slate-500", children: ["New: ", _jsx("span", { className: "font-bold text-slate-700 dark:text-slate-300", children: userRatingAfter })] })), _jsxs("div", { className: `inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black tabular-nums ring-1 ring-inset ${isPositiveElo
                                    ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    : isNegativeElo
                                        ? 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:bg-rose-500/15 dark:text-rose-400'
                                        : 'bg-slate-500/10 text-slate-600 ring-slate-500/30 dark:text-slate-400'}`, children: [isPositiveElo ? (_jsx(TrendingUp, { className: "h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" })) : isNegativeElo ? (_jsx(TrendingDown, { className: "h-3.5 w-3.5 text-rose-500 dark:text-rose-400" })) : (_jsx(Minus, { className: "h-3 w-3" })), _jsxs("span", { children: [isPositiveElo ? `+${eloDelta}` : eloDelta, " Elo"] })] }), onClick && (_jsx(ChevronRight, { className: "h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" }))] })] })] }));
}
