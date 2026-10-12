import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Trophy, Clock, FileText, Loader2, ShieldAlert, } from 'lucide-react';
import { useVerifyResult, useFeatureGameResult } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { DisputeModal } from './DisputeModal';
export function VerificationBanner({ gameId, proposal: passedProposal, sideAName = 'Side A', sideBName = 'Side B', proposerName = 'Opponent', onVerified, onDispute, canAct = true, className = '', }) {
    const { client, user } = useAuth();
    const [internalDisputeOpen, setInternalDisputeOpen] = useState(false);
    const [verifyError, setVerifyError] = useState(null);
    // If proposal wasn't passed directly as prop, query from shared feature hook
    const { data: gameResultData } = useFeatureGameResult(client, gameId, {
        enabled: !passedProposal && Boolean(gameId),
    });
    const proposal = passedProposal || gameResultData?.proposal;
    const verifyMutation = useVerifyResult(client, gameId);
    // If no proposal is pending verification, do not render banner
    if (!proposal)
        return null;
    // Extract score items
    const scoreA = proposal.scores[0]?.score ?? 0;
    const scoreB = proposal.scores[1]?.score ?? 0;
    const isAWinner = proposal.scores[0]?.winner ?? scoreA > scoreB;
    const isBWinner = proposal.scores[1]?.winner ?? scoreB > scoreA;
    // Format proposed timestamp
    const formattedDate = proposal.proposedAt
        ? new Date(proposal.proposedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
        : null;
    const handleVerify = async () => {
        setVerifyError(null);
        try {
            await verifyMutation.mutateAsync();
            onVerified?.();
        }
        catch (err) {
            setVerifyError(err?.message || 'Verification failed. Please check connection and try again.');
        }
    };
    const handleOpenDispute = () => {
        if (onDispute) {
            onDispute();
        }
        else {
            setInternalDisputeOpen(true);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: `relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-white to-emerald-500/10 p-5 shadow-lg backdrop-blur-md dark:from-amber-950/30 dark:via-slate-900/90 dark:to-emerald-950/30 sm:p-6 ${className}`, children: [_jsx("div", { className: "pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-amber-500/15 blur-2xl dark:bg-amber-500/20" }), _jsx("div", { className: "pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-500/15 blur-2xl dark:bg-emerald-500/20" }), _jsxs("div", { className: "relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-400", children: _jsx(Clock, { className: "h-6 w-6 animate-pulse" }) }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400", children: [_jsx(ShieldAlert, { className: "h-3.5 w-3.5" }), "Action Required"] }), _jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Score awaiting verification" })] }), _jsx("h3", { className: "text-lg font-bold text-slate-900 dark:text-slate-50", children: "Match Result Proposed" }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300", children: [_jsxs("span", { children: ["Submitted by", ' ', _jsx("strong", { className: "text-slate-800 dark:text-slate-200", children: proposerName })] }), formattedDate && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsxs("span", { className: "text-slate-500", children: ["at ", formattedDate] })] }))] })] })] }), _jsxs("div", { className: "flex items-center justify-center gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-800/80", children: [_jsxs("div", { className: "text-center", children: [_jsx("span", { className: "block text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[100px]", children: sideAName }), _jsxs("div", { className: "flex items-center justify-center gap-1", children: [_jsx("span", { className: `text-2xl font-black tabular-nums ${isAWinner
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : 'text-slate-800 dark:text-slate-200'}`, children: scoreA }), isAWinner && _jsx(Trophy, { className: "h-4 w-4 text-amber-500" })] })] }), _jsx("div", { className: "text-lg font-bold text-slate-300 dark:text-slate-600", children: ":" }), _jsxs("div", { className: "text-center", children: [_jsx("span", { className: "block text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[100px]", children: sideBName }), _jsxs("div", { className: "flex items-center justify-center gap-1", children: [_jsx("span", { className: `text-2xl font-black tabular-nums ${isBWinner
                                                            ? 'text-purple-600 dark:text-purple-400'
                                                            : 'text-slate-800 dark:text-slate-200'}`, children: scoreB }), isBWinner && _jsx(Trophy, { className: "h-4 w-4 text-amber-500" })] })] })] }), canAct && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", onClick: handleVerify, disabled: verifyMutation.isPending, className: "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", children: verifyMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: "Verifying..." })] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "h-4 w-4" }), _jsx("span", { children: "Confirm & Verify" })] })) }), _jsxs("button", { type: "button", onClick: handleOpenDispute, disabled: verifyMutation.isPending, className: "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), _jsx("span", { children: "Dispute" })] })] }))] }), proposal.notes && (_jsxs("div", { className: "mt-4 flex items-start gap-2 rounded-xl border border-slate-200/60 bg-white/50 p-3 text-xs text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/50 dark:text-slate-300", children: [_jsx(FileText, { className: "mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" }), _jsxs("span", { className: "italic", children: ["\"", proposal.notes, "\""] })] })), verifyError && (_jsxs("div", { className: "mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400", children: [_jsx(AlertTriangle, { className: "h-4 w-4 flex-shrink-0" }), _jsx("span", { children: verifyError })] }))] }), !onDispute && (_jsx(DisputeModal, { isOpen: internalDisputeOpen, onClose: () => setInternalDisputeOpen(false), gameId: gameId, proposedScores: proposal.scores }))] }));
}
