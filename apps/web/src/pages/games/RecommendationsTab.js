import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Sparkles, Target, TrendingUp, AlertCircle, Loader2, RefreshCw, ChevronRight, } from 'lucide-react';
import { useFeatureRecommendations } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
// ─── Confidence badge helpers ───────────────────────────────────────────────
const CONFIDENCE_STYLES = {
    high: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        ring: 'ring-emerald-500/30',
        dot: 'bg-emerald-400',
        label: 'High',
    },
    medium: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        ring: 'ring-amber-500/30',
        dot: 'bg-amber-400',
        label: 'Medium',
    },
    low: {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        ring: 'ring-red-500/30',
        dot: 'bg-red-400',
        label: 'Low',
    },
};
function ConfidenceBadge({ level }) {
    const s = CONFIDENCE_STYLES[level];
    return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`, children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${s.dot}` }), s.label, " confidence"] }));
}
// ─── Circular gauge ─────────────────────────────────────────────────────────
const GAUGE_RADIUS = 54;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
function scoreToColor(score) {
    if (score >= 0.8)
        return '#10b981'; // emerald-500
    if (score >= 0.6)
        return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
}
function ScoreGauge({ score }) {
    const pct = Math.round(score * 100);
    const offset = GAUGE_CIRCUMFERENCE * (1 - score);
    const color = scoreToColor(score);
    return (_jsxs("div", { className: "relative flex items-center justify-center", children: [_jsxs("svg", { width: 136, height: 136, viewBox: "0 0 136 136", className: "transform -rotate-90", children: [_jsx("circle", { cx: 68, cy: 68, r: GAUGE_RADIUS, fill: "none", stroke: "currentColor", className: "text-white/[0.06]", strokeWidth: 10 }), _jsx("circle", { cx: 68, cy: 68, r: GAUGE_RADIUS, fill: "none", stroke: color, strokeWidth: 10, strokeLinecap: "round", strokeDasharray: GAUGE_CIRCUMFERENCE, strokeDashoffset: offset, className: "transition-[stroke-dashoffset] duration-700 ease-out" })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [_jsxs("span", { className: "text-3xl font-bold tabular-nums tracking-tight", style: { color }, children: [pct, "%"] }), _jsx("span", { className: "mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400", children: "Match" })] })] }));
}
// ─── Factor bar ─────────────────────────────────────────────────────────────
function FactorBar({ name, value, weight, }) {
    const pct = Math.round(value * 100);
    const barColor = pct >= 75
        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
        : pct >= 50
            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
            : 'bg-gradient-to-r from-red-500 to-red-400';
    return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "font-medium capitalize text-slate-300", children: name }), _jsxs("span", { className: "tabular-nums text-slate-500", children: [pct, "%", ' ', _jsxs("span", { className: "text-slate-600", children: ["(\u00D7", weight.toFixed(1), ")"] })] })] }), _jsx("div", { className: "h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", children: _jsx("div", { className: `h-full rounded-full ${barColor} transition-all duration-500 ease-out`, style: { width: `${pct}%` } }) })] }));
}
// ─── Single recommendation card ─────────────────────────────────────────────
function RecommendationCard({ item }) {
    return (_jsxs("div", { className: "group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-slate-800/60 to-slate-900/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:shadow-xl hover:shadow-purple-500/5", children: [_jsx("div", { className: "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-0" }), _jsxs("div", { className: "mb-5 flex items-start justify-between gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-100 line-clamp-1", children: item.title }), _jsx("span", { className: "inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-purple-400 ring-1 ring-inset ring-purple-500/20", children: item.sportKey })] }), _jsx(ConfidenceBadge, { level: item.confidence })] }), _jsxs("div", { className: "flex flex-col items-center gap-6 sm:flex-row sm:items-start", children: [_jsx(ScoreGauge, { score: item.score }), _jsxs("div", { className: "flex-1 space-y-3 w-full", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500", children: "Factor Breakdown" }), item.factors.map((f) => (_jsx(FactorBar, { name: f.name, value: f.value, weight: f.weight }, f.name)))] })] }), item.reasons.length > 0 && (_jsxs("div", { className: "mt-6 rounded-xl bg-white/[0.03] p-4", children: [_jsxs("p", { className: "mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500", children: [_jsx(Target, { className: "h-3.5 w-3.5" }), "Why this game?"] }), _jsx("ul", { className: "space-y-2", children: item.reasons.map((reason, i) => (_jsxs("li", { className: "flex items-start gap-2 text-sm text-slate-300", children: [_jsx(ChevronRight, { className: "mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-400" }), _jsx("span", { children: reason })] }, i))) })] }))] }));
}
// ─── Loading skeleton ───────────────────────────────────────────────────────
function SkeletonCard() {
    return (_jsxs("div", { className: "animate-pulse rounded-2xl border border-white/[0.06] bg-slate-800/40 p-6", children: [_jsxs("div", { className: "mb-5 flex items-start justify-between", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "h-5 w-40 rounded-md bg-white/[0.06]" }), _jsx("div", { className: "h-4 w-20 rounded-md bg-white/[0.06]" })] }), _jsx("div", { className: "h-6 w-28 rounded-full bg-white/[0.06]" })] }), _jsxs("div", { className: "flex flex-col items-center gap-6 sm:flex-row sm:items-start", children: [_jsx("div", { className: "h-[136px] w-[136px] rounded-full bg-white/[0.06]" }), _jsx("div", { className: "flex-1 space-y-4 w-full", children: [1, 2, 3].map((n) => (_jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "h-3 w-24 rounded bg-white/[0.06]" }), _jsx("div", { className: "h-1.5 w-full rounded-full bg-white/[0.06]" })] }, n))) })] })] }));
}
// ─── Empty state ────────────────────────────────────────────────────────────
function EmptyState() {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-800/20 py-16 px-8 text-center", children: [_jsx("div", { className: "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10", children: _jsx(Sparkles, { className: "h-8 w-8 text-purple-400" }) }), _jsx("h3", { className: "mb-1 text-lg font-semibold text-slate-200", children: "No recommendations yet" }), _jsx("p", { className: "max-w-sm text-sm text-slate-400", children: "Complete your profile and play a few games so our AI can find the best matches for you." })] }));
}
// ─── Main export ────────────────────────────────────────────────────────────
export default function RecommendationsTab() {
    const { client } = useAuth();
    const { data, isLoading, isError, error, isMock, refetch, isFetching } = useFeatureRecommendations(client);
    return (_jsxs("section", { className: "mx-auto w-full max-w-4xl space-y-6 px-4 py-8", children: [_jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/20", children: _jsx(TrendingUp, { className: "h-5 w-5 text-white" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-slate-100", children: "AI Recommendations" }), _jsx("p", { className: "text-sm text-slate-400", children: "Personalised game suggestions just for you" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [isMock && (_jsx("span", { className: "rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/20", children: "Demo Data" })), _jsxs("button", { type: "button", onClick: () => refetch(), disabled: isFetching, className: "inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-slate-100 disabled:opacity-50", children: [_jsx(RefreshCw, { className: `h-4 w-4 ${isFetching ? 'animate-spin' : ''}` }), "Refresh"] })] })] }), isError && (_jsxs("div", { className: "flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4", children: [_jsx(AlertCircle, { className: "mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-red-300", children: "Failed to load recommendations" }), _jsx("p", { className: "mt-0.5 text-sm text-red-400/80", children: error?.message || 'An unexpected error occurred. Please try again.' })] })] })), isLoading && (_jsxs("div", { className: "space-y-5", children: [_jsx(SkeletonCard, {}), _jsx(SkeletonCard, {}), _jsx(SkeletonCard, {})] })), !isLoading && !isError && data && (_jsxs(_Fragment, { children: [data.items.length === 0 ? (_jsx(EmptyState, {})) : (_jsx("div", { className: "grid gap-5", children: data.items.map((item) => (_jsx(RecommendationCard, { item: item }, item.gameId))) })), isFetching && !isLoading && (_jsxs("div", { className: "flex items-center justify-center gap-2 py-3 text-xs text-slate-500", children: [_jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }), "Updating\u2026"] }))] }))] }));
}
