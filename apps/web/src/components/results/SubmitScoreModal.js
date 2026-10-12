import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Trophy, X, FileText, AlertCircle, Plus, Minus, Loader2, CheckCircle2, Shield, } from 'lucide-react';
import { useSubmitResult } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
export function SubmitScoreModal({ isOpen, onClose, gameId, sideAName = 'Side A', sideBName = 'Side B', sideAKey = 'side_a', sideBKey = 'side_b', onSuccess, }) {
    const { client } = useAuth();
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [notes, setNotes] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const submitMutation = useSubmitResult(client, gameId);
    // Reset inputs when modal opens
    useEffect(() => {
        if (isOpen) {
            setScoreA(0);
            setScoreB(0);
            setNotes('');
            setErrorMessage(null);
        }
    }, [isOpen]);
    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !submitMutation.isPending) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, submitMutation.isPending]);
    if (!isOpen)
        return null;
    // Determine winner automatically based on score
    const isAWinner = scoreA > scoreB;
    const isBWinner = scoreB > scoreA;
    const isTie = scoreA === scoreB && (scoreA > 0 || scoreB > 0);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        if (scoreA < 0 || scoreB < 0) {
            setErrorMessage('Scores must be non-negative numbers.');
            return;
        }
        if (scoreA === 0 && scoreB === 0) {
            const confirmZero = window.confirm('Both scores are 0. Are you sure you want to submit a 0-0 match result?');
            if (!confirmZero)
                return;
        }
        const payload = {
            scores: [
                { sideKey: sideAKey, score: Number(scoreA), winner: isAWinner },
                { sideKey: sideBKey, score: Number(scoreB), winner: isBWinner },
            ],
            notes: notes.trim() ? notes.trim() : undefined,
        };
        try {
            const result = await submitMutation.mutateAsync(payload);
            onSuccess?.(result);
            onClose();
        }
        catch (err) {
            setErrorMessage(err?.message || 'Failed to submit match score. Please check connection and try again.');
        }
    };
    return (_jsxs("div", { role: "dialog", "aria-modal": "true", className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity", onClick: () => {
                    if (!submitMutation.isPending)
                        onClose();
                } }), _jsxs("div", { className: "relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8", children: [_jsx("div", { className: "pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15" }), _jsxs("div", { className: "flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400", children: _jsx(Trophy, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold text-slate-900 dark:text-slate-50", children: "Submit Match Score" }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Enter game results for opponent verification" })] })] }), _jsx("button", { type: "button", onClick: onClose, disabled: submitMutation.isPending, className: "rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200", children: _jsx(X, { className: "h-5 w-5" }) })] }), errorMessage && (_jsxs("div", { className: "mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400", children: [_jsx(AlertCircle, { className: "h-4 w-4 flex-shrink-0 mt-0.5" }), _jsx("span", { children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit, className: "mt-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: `flex flex-col items-center rounded-2xl border p-4.5 transition-all ${isAWinner
                                            ? 'border-blue-500/40 bg-blue-50/60 ring-2 ring-blue-500/20 dark:border-blue-500/40 dark:bg-blue-950/20'
                                            : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40'}`, children: [_jsxs("div", { className: "mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200", children: [_jsx(Shield, { className: "h-3.5 w-3.5 text-blue-500" }), _jsx("span", { className: "truncate max-w-[120px]", children: sideAName })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setScoreA((prev) => Math.max(0, prev - 1)), className: "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300", children: _jsx(Minus, { className: "h-3.5 w-3.5" }) }), _jsx("input", { type: "number", min: "0", value: scoreA, onChange: (e) => setScoreA(Math.max(0, parseInt(e.target.value, 10) || 0)), className: "w-16 text-center text-3xl font-extrabold tabular-nums text-slate-900 focus:outline-none dark:text-white" }), _jsx("button", { type: "button", onClick: () => setScoreA((prev) => prev + 1), className: "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300", children: _jsx(Plus, { className: "h-3.5 w-3.5" }) })] }), isAWinner && (_jsxs("span", { className: "mt-3 inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 ring-1 ring-inset ring-blue-500/20 dark:text-blue-400", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), " Winner"] }))] }), _jsxs("div", { className: `flex flex-col items-center rounded-2xl border p-4.5 transition-all ${isBWinner
                                            ? 'border-purple-500/40 bg-purple-50/60 ring-2 ring-purple-500/20 dark:border-purple-500/40 dark:bg-purple-950/20'
                                            : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40'}`, children: [_jsxs("div", { className: "mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200", children: [_jsx(Shield, { className: "h-3.5 w-3.5 text-purple-500" }), _jsx("span", { className: "truncate max-w-[120px]", children: sideBName })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setScoreB((prev) => Math.max(0, prev - 1)), className: "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300", children: _jsx(Minus, { className: "h-3.5 w-3.5" }) }), _jsx("input", { type: "number", min: "0", value: scoreB, onChange: (e) => setScoreB(Math.max(0, parseInt(e.target.value, 10) || 0)), className: "w-16 text-center text-3xl font-extrabold tabular-nums text-slate-900 focus:outline-none dark:text-white" }), _jsx("button", { type: "button", onClick: () => setScoreB((prev) => prev + 1), className: "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300", children: _jsx(Plus, { className: "h-3.5 w-3.5" }) })] }), isBWinner && (_jsxs("span", { className: "mt-3 inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 ring-1 ring-inset ring-purple-500/20 dark:text-purple-400", children: [_jsx(CheckCircle2, { className: "h-3 w-3" }), " Winner"] }))] })] }), isTie && (_jsx("p", { className: "text-center text-xs font-medium text-amber-600 dark:text-amber-400", children: "Draw / Tie score will be submitted." })), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [_jsx(FileText, { className: "h-3.5 w-3.5" }), "Match Notes (Optional)"] }), _jsx("textarea", { rows: 3, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "e.g., 3 sets played, decisive tie-break in 3rd set. Great game!", className: "w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900" })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800", children: [_jsx("button", { type: "button", onClick: onClose, disabled: submitMutation.isPending, className: "rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50", children: "Cancel" }), _jsx("button", { type: "submit", disabled: submitMutation.isPending, className: "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", children: submitMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: "Submitting..." })] })) : (_jsx("span", { children: "Submit for Verification" })) })] })] })] })] }));
}
