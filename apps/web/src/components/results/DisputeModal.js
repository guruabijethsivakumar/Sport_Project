import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { AlertTriangle, X, ShieldAlert, Loader2, Info, Scale, } from 'lucide-react';
import { useDisputeResult } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
const COMMON_DISPUTE_REASONS = [
    'Incorrect score tally recorded',
    'Wrong match winner assigned',
    'Game was forfeit / abandoned early',
    'Unregistered substitute played',
];
export function DisputeModal({ isOpen, onClose, gameId, proposedScores, onSuccess, }) {
    const { client } = useAuth();
    const [reason, setReason] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const disputeMutation = useDisputeResult(client, gameId);
    useEffect(() => {
        if (isOpen) {
            setReason('');
            setErrorMessage(null);
        }
    }, [isOpen]);
    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !disputeMutation.isPending) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, disputeMutation.isPending]);
    if (!isOpen)
        return null;
    const handleSelectChip = (preset) => {
        if (!reason) {
            setReason(preset);
        }
        else if (!reason.includes(preset)) {
            setReason((prev) => `${prev}. ${preset}`);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        const trimmed = reason.trim();
        if (!trimmed) {
            setErrorMessage('Please provide a reason or explanation for disputing this result.');
            return;
        }
        if (trimmed.length < 10) {
            setErrorMessage('Please write a slightly more detailed explanation (at least 10 characters).');
            return;
        }
        const payload = {
            reason: trimmed,
        };
        try {
            await disputeMutation.mutateAsync(payload);
            onSuccess?.();
            onClose();
        }
        catch (err) {
            setErrorMessage(err?.message || 'Failed to submit dispute. Please check connection and try again.');
        }
    };
    return (_jsxs("div", { role: "dialog", "aria-modal": "true", className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity", onClick: () => {
                    if (!disputeMutation.isPending)
                        onClose();
                } }), _jsxs("div", { className: "relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-red-500/30 bg-white p-6 shadow-2xl dark:border-red-500/30 dark:bg-slate-900 sm:p-8", children: [_jsx("div", { className: "pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-600/10 blur-3xl dark:bg-red-600/20" }), _jsxs("div", { className: "flex items-center justify-between pb-5 border-b border-red-100 dark:border-red-950/60", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-600 ring-1 ring-red-500/30 dark:text-red-400", children: _jsx(ShieldAlert, { className: "h-6 w-6" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-lg font-bold text-slate-900 dark:text-slate-50", children: "Dispute Match Result" }), _jsx("span", { className: "rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 ring-1 ring-inset ring-red-500/20 dark:text-red-400", children: "Contested Call" })] }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Flag discrepancies before Elo ratings are processed" })] })] }), _jsx("button", { type: "button", onClick: onClose, disabled: disputeMutation.isPending, className: "rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300", children: [_jsx(Info, { className: "mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" }), _jsx("p", { children: "Filing a dispute pauses automatic rating adjustments for all players. Both sides and match moderators will be alerted to review the score." })] }), errorMessage && (_jsxs("div", { className: "mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400", children: [_jsx(AlertTriangle, { className: "h-4 w-4 flex-shrink-0 mt-0.5" }), _jsx("span", { children: errorMessage })] })), _jsxs("form", { onSubmit: handleSubmit, className: "mt-5 space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2", children: "Common Dispute Reasons" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: COMMON_DISPUTE_REASONS.map((chip, i) => (_jsxs("button", { type: "button", onClick: () => handleSelectChip(chip), className: "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-red-900 dark:hover:bg-red-950/40", children: ["+ ", chip] }, i))) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Scale, { className: "h-3.5 w-3.5 text-red-500" }), "Explanation of Contested Call"] }), _jsxs("span", { className: "text-[11px] font-normal tabular-nums text-slate-400", children: [reason.length, " characters"] })] }), _jsx("textarea", { rows: 4, value: reason, onChange: (e) => setReason(e.target.value), placeholder: "Explain clearly what happened (e.g., 'We won the second set 21-17, but the submission claims 21-12 in favor of Side B...')", className: "w-full rounded-2xl border border-red-200/80 bg-red-50/20 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-900/60 dark:bg-red-950/20 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-500 dark:focus:bg-slate-900" })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800", children: [_jsx("button", { type: "button", onClick: onClose, disabled: disputeMutation.isPending, className: "rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50", children: "Cancel" }), _jsx("button", { type: "submit", disabled: disputeMutation.isPending, className: "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-600/25 transition-all hover:bg-red-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", children: disputeMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: "Submitting Dispute..." })] })) : (_jsxs(_Fragment, { children: [_jsx(AlertTriangle, { className: "h-4 w-4" }), _jsx("span", { children: "Submit Dispute" })] })) })] })] })] })] }));
}
