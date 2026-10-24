import React, { useState, useEffect } from 'react';
import {
  Trophy,
  X,
  FileText,
  AlertCircle,
  Plus,
  Minus,
  Loader2,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { useSubmitResult, type SubmitResultPayload } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';

export interface SubmitScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  sideAName?: string;
  sideBName?: string;
  sideAKey?: string;
  sideBKey?: string;
  onSuccess?: (result: any) => void;
}

export function SubmitScoreModal({
  isOpen,
  onClose,
  gameId,
  sideAName = 'Side A',
  sideBName = 'Side B',
  sideAKey = 'side_a',
  sideBKey = 'side_b',
  onSuccess,
}: SubmitScoreModalProps) {
  const { client } = useAuth();
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitMutation.isPending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, submitMutation.isPending]);

  if (!isOpen) return null;

  // Determine winner automatically based on score
  const isAWinner = scoreA > scoreB;
  const isBWinner = scoreB > scoreA;
  const isTie = scoreA === scoreB && (scoreA > 0 || scoreB > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (scoreA < 0 || scoreB < 0) {
      setErrorMessage('Scores must be non-negative numbers.');
      return;
    }

    if (scoreA === 0 && scoreB === 0) {
      const confirmZero = window.confirm(
        'Both scores are 0. Are you sure you want to submit a 0-0 match result?'
      );
      if (!confirmZero) return;
    }

    const payload: SubmitResultPayload = {
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
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to submit match score. Please check connection and try again.'
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
          if (!submitMutation.isPending) onClose();
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl sm:p-8">
        {/* Glow effect */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Submit Match Score
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter game results for opponent verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitMutation.isPending}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Side A vs Side B Score Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Side A Score Card */}
            <div
              className={`flex flex-col items-center rounded-xl border p-4 transition-all ${
                isAWinner
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'border-border bg-muted/40'
              }`}
            >
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="truncate max-w-[120px]">{sideAName}</span>
              </div>

              {/* Stepper Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScoreA((prev) => Math.max(0, prev - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-muted active:scale-95 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-16 bg-transparent text-center text-3xl font-extrabold tabular-nums text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setScoreA((prev) => prev + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-muted active:scale-95 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {isAWinner && (
                <span className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/30">
                  <CheckCircle2 className="h-3 w-3" /> Winner
                </span>
              )}
            </div>

            {/* Side B Score Card */}
            <div
              className={`flex flex-col items-center rounded-xl border p-4 transition-all ${
                isBWinner
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'border-border bg-muted/40'
              }`}
            >
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="truncate max-w-[120px]">{sideBName}</span>
              </div>

              {/* Stepper Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScoreB((prev) => Math.max(0, prev - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-muted active:scale-95 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-16 bg-transparent text-center text-3xl font-extrabold tabular-nums text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setScoreB((prev) => prev + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-muted active:scale-95 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {isBWinner && (
                <span className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/30">
                  <CheckCircle2 className="h-3 w-3" /> Winner
                </span>
              )}
            </div>
          </div>

          {isTie && (
            <p className="text-center text-xs font-medium text-warning">
              Draw / Tie score will be submitted.
            </p>
          )}

          {/* Optional Match Notes */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Match Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., 3 sets played, decisive tie-break in 3rd set. Great game!"
              className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitMutation.isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary-hover active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit for Verification</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
