import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Users, Scale, RefreshCw, Zap, Shield, ArrowRightLeft, CheckCircle2, AlertCircle, Sparkles, TrendingUp, Crown, } from 'lucide-react';
import { useFeatureTeamSuggestion, useRegenerateTeams } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
// ─── Solver simulation steps ─────────────────────────────────────────────────
const SOLVER_STEPS = [
    'Analyzing player rating distributions...',
    'Executing snake-draft round permutations (A-B-B-A)...',
    'Minimizing side Elo variance & balancing roles...',
    'Finalizing balanced rosters...',
];
export function TeamBalancingView({ gameId = 'default-game', initialData, canManage = true, onTeamsRegenerated, className = '', }) {
    const { client } = useAuth();
    const [isSolving, setIsSolving] = useState(false);
    const [solverStepIndex, setSolverStepIndex] = useState(0);
    // Hook for team suggestion (used when initialData is not passed)
    const { data: fetchedData, isLoading: isQueryLoading, isError, error, isMock, refetch, } = useFeatureTeamSuggestion(client, gameId, {
        enabled: !initialData && Boolean(gameId),
    });
    // Mutation for backend regeneration
    const regenerateMutation = useRegenerateTeams(client, gameId);
    const teamData = initialData || fetchedData;
    const handleRegenerate = async () => {
        if (isSolving)
            return;
        setIsSolving(true);
        setSolverStepIndex(0);
        // Visual snake draft solver animation cycle
        const stepInterval = setInterval(() => {
            setSolverStepIndex((prev) => (prev < SOLVER_STEPS.length - 1 ? prev + 1 : prev));
        }, 400);
        try {
            if (gameId && !initialData) {
                await regenerateMutation.mutateAsync();
                await refetch();
            }
            else {
                // Fallback simulated solver latency
                await new Promise((r) => setTimeout(r, 1500));
            }
            onTeamsRegenerated?.(teamData);
        }
        catch {
            // In case server generation fails in mock/demo mode, refetch fallback
            await refetch();
        }
        finally {
            clearInterval(stepInterval);
            setTimeout(() => {
                setIsSolving(false);
                setSolverStepIndex(0);
            }, 350);
        }
    };
    if (!initialData && isQueryLoading) {
        return _jsx(TeamBalancingSkeleton, {});
    }
    if (!initialData && isError) {
        return (_jsxs("div", { className: "rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center", children: [_jsx(AlertCircle, { className: "mx-auto mb-2 h-8 w-8 text-red-400" }), _jsx("h3", { className: "text-base font-semibold text-red-300", children: "Failed to load team split" }), _jsx("p", { className: "mt-1 text-sm text-red-400/80", children: error?.message || 'Unable to balance teams at this moment.' }), _jsxs("button", { type: "button", onClick: () => refetch(), className: "mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-500/20 hover:bg-red-500/20", children: [_jsx(RefreshCw, { className: "h-3.5 w-3.5" }), "Retry"] })] }));
    }
    // Fallback defaults if no teams returned yet
    const sideA = teamData?.teams[0] || {
        sideKey: 'side_a',
        name: 'Side A',
        players: [],
        ratingTotal: 0,
        ratingAverage: 0,
    };
    const sideB = teamData?.teams[1] || {
        sideKey: 'side_b',
        name: 'Side B',
        players: [],
        ratingTotal: 0,
        ratingAverage: 0,
    };
    const delta = Math.abs(sideA.ratingTotal - sideB.ratingTotal);
    const totalRosterCount = sideA.players.length + sideB.players.length;
    // Delta quality scoring
    const isPerfect = delta === 0;
    const isExcellent = delta <= 25;
    const isFair = delta <= 60;
    return (_jsxs("div", { className: `relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-8 ${className}`, children: [_jsx("div", { className: "pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-600/10" }), _jsx("div", { className: "pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/5 blur-3xl dark:bg-purple-600/10" }), _jsxs("div", { className: "relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20", children: _jsx(Scale, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50", children: "Balanced Team Rosters" }), isMock && (_jsx("span", { className: "rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400", children: "Demo" }))] }), _jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: ["Optimal Elo snake-draft distribution across ", totalRosterCount, " players"] })] })] }), canManage && (_jsxs("button", { type: "button", onClick: handleRegenerate, disabled: isSolving || regenerateMutation.isPending, className: "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70", children: [_jsx(RefreshCw, { className: `h-4 w-4 transition-transform ${isSolving || regenerateMutation.isPending ? 'animate-spin' : 'group-hover:rotate-180'}` }), _jsx("span", { children: isSolving ? 'Solving Draft...' : 'Regenerate Balanced Teams' })] }))] }), isSolving && (_jsxs("div", { className: "relative mb-6 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-5 backdrop-blur-md", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-inner", children: _jsx(Zap, { className: "h-4 w-4 animate-bounce" }) }), _jsxs("div", { className: "flex-1 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400", children: "Snake Draft Elo Solver Active" }), _jsxs("span", { className: "text-[11px] font-medium text-slate-500 dark:text-slate-400", children: ["Step ", solverStepIndex + 1, " of ", SOLVER_STEPS.length] })] }), _jsx("p", { className: "text-sm font-semibold text-slate-800 dark:text-slate-200", children: SOLVER_STEPS[solverStepIndex] })] })] }), _jsx("div", { className: "mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/60", children: _jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300", style: {
                                width: `${((solverStepIndex + 1) / SOLVER_STEPS.length) * 100}%`,
                            } }) })] })), _jsxs("div", { className: "mb-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4.5 dark:border-slate-800/80 dark:bg-slate-800/40", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `flex h-10 w-10 items-center justify-center rounded-xl font-bold ring-1 ring-inset ${isPerfect
                                            ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
                                            : isExcellent
                                                ? 'bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400'
                                                : isFair
                                                    ? 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400'
                                                    : 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400'}`, children: _jsx(ArrowRightLeft, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Balance Rating Delta" }), _jsxs("span", { className: `inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${isPerfect
                                                            ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
                                                            : isExcellent
                                                                ? 'bg-blue-500/10 text-blue-600 ring-blue-500/30 dark:text-blue-400'
                                                                : isFair
                                                                    ? 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400'
                                                                    : 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400'}`, children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), isPerfect
                                                                ? 'Perfect Balance (0 Δ)'
                                                                : isExcellent
                                                                    ? `Excellent Match (Δ ${delta} Elo)`
                                                                    : isFair
                                                                        ? `Fair Variance (Δ ${delta} Elo)`
                                                                        : `Higher Variance (Δ ${delta} Elo)`] })] }), _jsxs("p", { className: "text-xs text-slate-600 dark:text-slate-300", children: ["Algorithm:", ' ', _jsx("span", { className: "font-semibold text-slate-900 dark:text-white", children: teamData?.balance.method.replace(/_/g, ' ') || 'Snake Draft Elo Solver' })] })] })] }), _jsxs("div", { className: "flex items-center gap-4 text-right", children: [_jsxs("div", { children: [_jsxs("span", { className: "block text-[11px] font-medium text-slate-500 dark:text-slate-400", children: [sideA.name, " Total"] }), _jsxs("span", { className: "text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400", children: [sideA.ratingTotal.toLocaleString(), " Elo"] })] }), _jsx("div", { className: "text-xs font-semibold text-slate-400", children: "vs" }), _jsxs("div", { children: [_jsxs("span", { className: "block text-[11px] font-medium text-slate-500 dark:text-slate-400", children: [sideB.name, " Total"] }), _jsxs("span", { className: "text-sm font-bold tabular-nums text-purple-600 dark:text-purple-400", children: [sideB.ratingTotal.toLocaleString(), " Elo"] })] })] })] }), teamData?.reasons && teamData.reasons.length > 0 && (_jsx("div", { className: "mt-3.5 flex flex-wrap gap-2 border-t border-slate-200/60 pt-3 dark:border-slate-800/60", children: teamData.reasons.map((reason, idx) => (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-2xs ring-1 ring-slate-200/80 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-700/60", children: [_jsx(Sparkles, { className: "h-3 w-3 text-indigo-500 dark:text-indigo-400" }), reason] }, idx))) }))] }), _jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2", children: [_jsx(TeamRosterColumn, { team: sideA, theme: "blue", tagLabel: "Side A", isSolving: isSolving }), _jsx(TeamRosterColumn, { team: sideB, theme: "purple", tagLabel: "Side B", isSolving: isSolving })] })] }));
}
function TeamRosterColumn({ team, theme, tagLabel, isSolving }) {
    const isBlue = theme === 'blue';
    const themeClasses = isBlue
        ? {
            border: 'border-blue-500/20 dark:border-blue-500/30',
            headerBg: 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent',
            badgeBg: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
            ringGlow: 'hover:border-blue-500/40',
            accentText: 'text-blue-600 dark:text-blue-400',
            avatarBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        }
        : {
            border: 'border-purple-500/20 dark:border-purple-500/30',
            headerBg: 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent',
            badgeBg: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
            ringGlow: 'hover:border-purple-500/40',
            accentText: 'text-purple-600 dark:text-purple-400',
            avatarBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
        };
    return (_jsxs("div", { className: `flex flex-col rounded-2xl border ${themeClasses.border} ${themeClasses.ringGlow} bg-slate-50/50 backdrop-blur-xs transition-all dark:bg-slate-900/60`, children: [_jsx("div", { className: `rounded-t-2xl border-b border-slate-200/80 p-5 dark:border-slate-800 ${themeClasses.headerBg}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("span", { className: `inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${themeClasses.badgeBg}`, children: [_jsx(Shield, { className: "h-3 w-3" }), tagLabel] }), _jsx("h3", { className: "text-lg font-bold text-slate-900 dark:text-slate-100", children: team.name })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "flex items-baseline justify-end gap-1.5", children: [_jsx("span", { className: `text-2xl font-extrabold tabular-nums tracking-tight ${themeClasses.accentText}`, children: team.ratingTotal.toLocaleString() }), _jsx("span", { className: "text-xs font-semibold uppercase text-slate-400", children: "Elo" })] }), _jsxs("div", { className: "text-[11px] font-medium text-slate-500 dark:text-slate-400", children: ["Avg: ", _jsx("span", { className: "font-semibold text-slate-700 dark:text-slate-300", children: team.ratingAverage }), " \u2022 ", team.players.length, " players"] })] })] }) }), _jsx("div", { className: "flex-1 space-y-2.5 p-4 sm:p-5", children: team.players.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800", children: [_jsx(Users, { className: "mb-2 h-6 w-6 text-slate-400" }), _jsx("p", { className: "text-xs font-medium text-slate-500", children: "No players assigned yet" })] })) : (team.players.map((player, index) => {
                    // Simulated snake draft pick round calculation
                    // Round 1: A1, B1. Round 2: B2, A2.
                    const pickNumber = isBlue
                        ? index % 2 === 0
                            ? index * 2 + 1
                            : index * 2 + 2
                        : index % 2 === 0
                            ? index * 2 + 2
                            : index * 2 + 1;
                    return (_jsxs("div", { className: `group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-slate-700 ${isSolving ? 'animate-pulse' : ''}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs ${themeClasses.avatarBg}`, children: player.displayName?.slice(0, 2).toUpperCase() || 'PL' }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400", children: player.displayName }), index === 0 && (_jsx("span", { title: "Top Seed in Side", children: _jsx(Crown, { className: "h-3.5 w-3.5 text-amber-500" }) }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [player.position && (_jsx("span", { className: "rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-300", children: player.position })), _jsxs("span", { className: "text-[10px] text-slate-400", children: ["Pick #", pickNumber] })] })] })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("span", { className: "inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-800 dark:bg-slate-700 dark:text-slate-200", children: [_jsx(TrendingUp, { className: "h-3 w-3 text-slate-400" }), player.rating] }) })] }, player.userId || index));
                })) })] }));
}
// ─── Loading Skeleton ────────────────────────────────────────────────────────
function TeamBalancingSkeleton() {
    return (_jsxs("div", { className: "animate-pulse rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-800" }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" }), _jsx("div", { className: "h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" })] })] }), _jsx("div", { className: "h-10 w-44 rounded-xl bg-slate-200 dark:bg-slate-800" })] }), _jsx("div", { className: "mb-6 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/40" }), _jsx("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2", children: [1, 2].map((col) => (_jsxs("div", { className: "space-y-3 rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsx("div", { className: "h-12 rounded-xl bg-slate-200 dark:bg-slate-800" }), [1, 2].map((i) => (_jsx("div", { className: "h-14 rounded-xl bg-slate-100 dark:bg-slate-800/60" }, i)))] }, col))) })] }));
}
