import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  Loader2,
  Info,
  Scale,
} from 'lucide-react';
import { useDisputeResult, type DisputeResultPayload } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  proposedScores?: Array<{ sideKey: string; score: number }>;
  onSuccess?: () => void;
}

const COMMON_DISPUTE_REASONS = [
  'Incorrect score tally recorded',
  'Wrong match winner assigned',
  'Game was forfeit / abandoned early',
  'Unregistered substitute played',
];

export function DisputeModal({
  isOpen,
  onClose,
  gameId,
  proposedScores,
  onSuccess,
}: DisputeModalProps) {
  const { client } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const disputeMutation = useDisputeResult(client, gameId);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !disputeMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, disputeMutation.isPending]);

  if (!isOpen) return null;

  const handleSelectChip = (preset: string) => {
    if (!reason) {
      setReason(preset);
    } else if (!reason.includes(preset)) {
      setReason((prev) => `${prev}. ${preset}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    const payload: DisputeResultPayload = {
      reason: trimmed,
    };

    try {
      await disputeMutation.mutateAsync(payload);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to submit dispute. Please check connection and try again.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!disputeMutation.isPending) onClose();
        }}
      />

      {/* Modal Dialog Card with Warning / Danger theme */}
      <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto rounded-2xl border border-danger/40 bg-card text-foreground p-6 shadow-2xl sm:p-8">
        {/* Subtle danger ambient glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-danger/10 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-danger/15 text-danger ring-1 ring-danger/30">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Dispute Match Result
                </h2>
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-danger ring-1 ring-inset ring-danger/20">
                  Contested Call
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Flag discrepancies before Elo ratings are processed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={disputeMutation.isPending}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Notice Banner */}
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs text-warning">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          <p>
            Filing a dispute pauses automatic rating adjustments for all players. Both sides
            and match moderators will be alerted to review the score.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Quick preset chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Common Dispute Reasons
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_DISPUTE_REASONS.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectChip(chip)}
                  className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-danger hover:bg-danger/10"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-danger" />
                Explanation of Contested Call
              </span>
              <span className="text-[11px] font-normal tabular-nums text-muted-foreground">
                {reason.length} characters
              </span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain clearly what happened (e.g., 'We won the second set 21-17, but the submission claims 21-12 in favor of Side B...')"
              className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground placeholder:text-placeholder focus:border-danger focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={disputeMutation.isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disputeMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-bold text-danger-foreground shadow-md shadow-danger/25 transition-all hover:bg-danger-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {disputeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Dispute...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>Submit Dispute</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
