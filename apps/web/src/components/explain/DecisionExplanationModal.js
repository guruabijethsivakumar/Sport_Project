import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { X, Sparkles, Calculator, TrendingUp, Target, ShieldCheck, Scale, ChevronRight, Info, Zap, } from 'lucide-react';
// ─── Default Sample Data ─────────────────────────────────────────────────────
const DEFAULT_GAME_DATA = {
    gameTitle: 'Saturday Evening Doubles',
    sportKey: 'badminton',
    matchScore: 0.92,
    confidence: 'high',
    factors: [
        {
            name: 'Skill Compatibility',
            value: 0.95,
            weight: 1.5,
            description: 'Opponents and partner within ±45 Elo of your rating',
        },
        {
            name: 'Geographic Proximity',
            value: 0.88,
            weight: 1.2,
            description: 'Venue located 2.4 km from your primary travel zone',
        },
        {
            name: 'Schedule Alignment',
            value: 0.92,
            weight: 1.0,
            description: 'Matches your regular weekend playing preferences',
        },
        {
            name: 'Host Reliability',
            value: 0.96,
            weight: 1.0,
            description: 'Host holds a 98% attendance and match fulfillment rating',
        },
    ],
    reasons: [
        'Optimal skill bracket: 95% likelihood of a competitive, balanced set',
        'Short travel time: Estimated 8 minutes from your location',
        'Court surface & format match your preferred doubles profile',
    ],
};
const DEFAULT_RATING_DATA = {
    sportKey: 'badminton',
    ratingBefore: 1200,
    ratingAfter: 1218.6,
    delta: 18.6,
    expectedScore: 0.42,
    actualScore: 1.0,
    kFactor: 32,
    opponentRatingAverage: 1245,
    marginOfVictory: '2 - 1 Sets',
    provisionalMultiplier: 1.0,
    explanationText: 'Because your opponents entered the match with a higher average rating (1,245 vs 1,200), the model predicted a 42% win probability. Securing victory yielded an elevated rating gain of +18.6 points.',
};
export function DecisionExplanationModal({ isOpen, onClose, mode: initialMode = 'game', gameData = DEFAULT_GAME_DATA, ratingData = DEFAULT_RATING_DATA, className = '', }) {
    const [activeTab, setActiveTab] = useState(initialMode);
    // Sync activeTab when mode prop changes
    useEffect(() => {
        setActiveTab(initialMode);
    }, [initialMode]);
    // Handle ESC key press
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
    return (_jsxs("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "explanation-modal-title", className: "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6", children: [_jsx("div", { className: "fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity", onClick: onClose }), _jsxs("div", { className: `relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${className}`, children: [_jsx("div", { className: "pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" }), _jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800/80", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20", children: _jsx(Sparkles, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("h2", { id: "explanation-modal-title", className: "text-lg font-bold text-slate-900 dark:text-slate-50", children: "Decision Explainability" }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Transparent breakdown of matchmaking AI & Elo calculations" })] })] }), _jsx("button", { type: "button", onClick: onClose, "aria-label": "Close dialog", className: "rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "flex border-b border-slate-100 bg-slate-50/60 px-6 dark:border-slate-800 dark:bg-slate-800/30", children: [_jsxs("button", { type: "button", onClick: () => setActiveTab('game'), className: `flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${activeTab === 'game'
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`, children: [_jsx(Target, { className: "h-4 w-4" }), "Why This Game?"] }), _jsxs("button", { type: "button", onClick: () => setActiveTab('rating'), className: `ml-6 flex items-center gap-2 border-b-2 py-3 text-xs font-bold transition-colors ${activeTab === 'rating'
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`, children: [_jsx(Calculator, { className: "h-4 w-4" }), "Why This Rating Change?"] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: activeTab === 'game' ? (_jsx(GameExplanationView, { data: gameData })) : (_jsx(RatingExplanationView, { data: ratingData })) }), _jsx("div", { className: "flex items-center justify-end border-t border-slate-100 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-900/60", children: _jsx("button", { type: "button", onClick: onClose, className: "rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white", children: "Got it, thanks" }) })] })] }));
}
// ─── Subcomponent: Game Explanation View ('Why this game?') ──────────────────
function GameExplanationView({ data }) {
    const normalizedScore = data.matchScore <= 1 ? Math.round(data.matchScore * 100) : Math.round(data.matchScore);
    const confidence = data.confidence || 'high';
    const confidenceColor = confidence === 'high'
        ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
        : confidence === 'medium'
            ? 'bg-amber-500/10 text-amber-600 ring-amber-500/30 dark:text-amber-400'
            : 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400';
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent p-5 dark:border-indigo-500/30", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400", children: "Compatibility Score" }), _jsxs("div", { className: "mt-1 flex items-baseline gap-2", children: [_jsxs("span", { className: "text-3xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white", children: [normalizedScore, "%"] }), _jsx("span", { className: "text-xs font-semibold text-slate-500 dark:text-slate-400", children: "Match Quality" })] }), data.gameTitle && (_jsxs("p", { className: "mt-1 text-xs text-slate-600 dark:text-slate-300", children: ["For: ", _jsx("strong", { className: "font-semibold", children: data.gameTitle })] }))] }), _jsxs("span", { className: `rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${confidenceColor}`, children: [confidence, " Confidence"] })] }), data.factors && data.factors.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("h4", { className: "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [_jsx(Scale, { className: "h-3.5 w-3.5" }), "Matchmaking Factor Breakdown"] }), _jsx("div", { className: "space-y-3", children: data.factors.map((factor, idx) => {
                            const pct = Math.round(factor.value <= 1 ? factor.value * 100 : factor.value);
                            const barColor = pct >= 80
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                : pct >= 60
                                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                                    : 'bg-gradient-to-r from-amber-500 to-amber-400';
                            return (_jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/40", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsx("span", { className: "font-bold text-slate-800 dark:text-slate-200", children: factor.name }), _jsxs("span", { className: "font-extrabold tabular-nums text-slate-700 dark:text-slate-300", children: [pct, "%", ' ', _jsxs("span", { className: "text-[10px] font-normal text-slate-400", children: ["(wt: ", factor.weight, "x)"] })] })] }), _jsx("div", { className: "mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/60", children: _jsx("div", { className: `h-full rounded-full ${barColor} transition-all duration-500`, style: { width: `${pct}%` } }) }), factor.description && (_jsx("p", { className: "mt-2 text-[11px] text-slate-500 dark:text-slate-400", children: factor.description }))] }, idx));
                        }) })] })), data.reasons && data.reasons.length > 0 && (_jsxs("div", { className: "rounded-2xl border border-slate-100 bg-slate-50/50 p-4.5 dark:border-slate-800 dark:bg-slate-800/30", children: [_jsxs("h4", { className: "mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [_jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-indigo-500" }), "Key Match Drivers"] }), _jsx("ul", { className: "space-y-2", children: data.reasons.map((reason, i) => (_jsxs("li", { className: "flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300", children: [_jsx(ChevronRight, { className: "mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-500" }), _jsx("span", { children: reason })] }, i))) })] }))] }));
}
// ─── Subcomponent: Rating Explanation View ('Why this rating change?') ────────
function RatingExplanationView({ data }) {
    const isPositive = data.delta > 0;
    const isNegative = data.delta < 0;
    const expectedPct = data.expectedScore
        ? Math.round(data.expectedScore * 100)
        : 50;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/50", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-400", children: "Rating Movement" }), _jsxs("div", { className: "mt-1 flex items-baseline gap-2", children: [_jsx("span", { className: "text-xl font-bold tabular-nums text-slate-500 dark:text-slate-400", children: data.ratingBefore }), _jsx("span", { className: "text-sm font-semibold text-slate-400", children: "\u2192" }), _jsx("span", { className: "text-2xl font-black tabular-nums text-slate-900 dark:text-white", children: typeof data.ratingAfter === 'number' ? data.ratingAfter.toFixed(1) : data.ratingAfter }), _jsx("span", { className: "text-xs font-bold text-slate-400 uppercase", children: "Elo" })] })] }), _jsxs("div", { className: `flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-black tabular-nums ring-1 ring-inset ${isPositive
                            ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400'
                            : isNegative
                                ? 'bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400'
                                : 'bg-slate-500/10 text-slate-600 ring-slate-500/30 dark:text-slate-400'}`, children: [_jsx(TrendingUp, { className: "h-4 w-4" }), _jsxs("span", { children: [isPositive ? `+${data.delta}` : data.delta, " Elo"] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("h4", { className: "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [_jsx(Calculator, { className: "h-3.5 w-3.5" }), "Elo Formula Variables"] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3", children: [_jsxs("div", { className: "rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80", children: [_jsx("span", { className: "block text-[11px] font-medium text-slate-400", children: "Expected Win Prob. (E)" }), _jsxs("span", { className: "mt-1 block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white", children: [expectedPct, "%"] })] }), _jsxs("div", { className: "rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80", children: [_jsx("span", { className: "block text-[11px] font-medium text-slate-400", children: "Actual Result (S)" }), _jsx("span", { className: "mt-1 block text-lg font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400", children: data.actualScore !== undefined
                                            ? data.actualScore === 1
                                                ? 'Win (1.0)'
                                                : data.actualScore === 0.5
                                                    ? 'Draw (0.5)'
                                                    : 'Loss (0.0)'
                                            : 'Win (1.0)' })] }), _jsxs("div", { className: "rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80", children: [_jsx("span", { className: "block text-[11px] font-medium text-slate-400", children: "K-Factor Stakes (K)" }), _jsx("span", { className: "mt-1 block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white", children: data.kFactor || 32 })] }), data.opponentRatingAverage && (_jsxs("div", { className: "rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80", children: [_jsx("span", { className: "block text-[11px] font-medium text-slate-400", children: "Opponent Avg Elo" }), _jsx("span", { className: "mt-1 block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white", children: data.opponentRatingAverage })] })), data.marginOfVictory && (_jsxs("div", { className: "rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80", children: [_jsx("span", { className: "block text-[11px] font-medium text-slate-400", children: "Margin of Victory" }), _jsx("span", { className: "mt-1 block text-lg font-extrabold text-slate-900 dark:text-white", children: data.marginOfVictory })] })), data.provisionalMultiplier && (_jsxs("div", { className: "rounded-xl border border-slate-100 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/80", children: [_jsx("span", { className: "block text-[11px] font-medium text-slate-400", children: "Multiplier" }), _jsxs("span", { className: "mt-1 block text-lg font-extrabold text-slate-900 dark:text-white", children: [data.provisionalMultiplier, "x"] })] }))] })] }), _jsxs("div", { className: "rounded-2xl border border-indigo-500/20 bg-indigo-50/50 p-4 font-mono text-xs text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-950/30 dark:text-indigo-200", children: [_jsxs("div", { className: "flex items-center gap-2 font-bold mb-1", children: [_jsx(Zap, { className: "h-3.5 w-3.5 text-indigo-500" }), _jsx("span", { children: "Calculation: \u0394R = K \u00D7 (S - E)" })] }), _jsxs("p", { className: "text-[11px] text-indigo-700/80 dark:text-indigo-300/80 font-sans mt-1", children: ["\u0394R = ", data.kFactor || 32, " \u00D7 (", data.actualScore !== undefined ? data.actualScore : 1.0, " -", ' ', data.expectedScore !== undefined ? data.expectedScore : 0.42, ") =", ' ', data.delta > 0 ? `+${data.delta}` : data.delta, " Elo"] })] }), data.explanationText && (_jsxs("div", { className: "flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300", children: [_jsx(Info, { className: "mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" }), _jsx("p", { children: data.explanationText })] }))] }));
}
