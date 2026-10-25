import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameByInviteCode, useJoinGame } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export function InviteCodeModal({
  isOpen,
  onClose,
  initialCode = '',
}: InviteCodeModalProps): React.ReactElement {
  const { client } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [code, setCode] = useState(initialCode);
  const [submittedCode, setSubmittedCode] = useState(initialCode.trim().toUpperCase());

  const {
    data: gameData,
    isLoading,
    isError,
    error,
  } = useGameByInviteCode(client, submittedCode, {
    enabled: Boolean(submittedCode.length >= 4),
  });

  const game = (gameData as any)?.game || (gameData as any)?.data || gameData;
  const gameId = game?.id || game?._id;
  const isGameCancelled = game?.status === 'cancelled' || game?.status === 'CANCELLED';
  const joinMutation = useJoinGame(client, gameId || '');

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean) {
      setSubmittedCode(clean);
    }
  };

  const handleJoinGame = async () => {
    if (!gameId || isGameCancelled) return;
    try {
      const res: any = await joinMutation.mutateAsync();
      const status = res?.status || res?.data?.status;
      if (status === 'requested' || game?.joinPolicy === 'approval') {
        toast({
          title: 'Join Request Sent',
          description: 'Your request was sent and is awaiting the game creator\'s approval.',
          type: 'info',
        });
      } else if (status === 'waitlisted') {
        toast({
          title: 'Added to Waitlist',
          description: 'This match is currently full. You have been added to the waitlist.',
          type: 'warning',
        });
      } else {
        toast({
          title: 'Joined Match!',
          description: 'You have successfully joined the private game.',
          type: 'success',
        });
      }
      onClose();
      navigate(`/games/${gameId}?code=${encodeURIComponent(submittedCode)}`);
    } catch (err: any) {
      toast({
        title: 'Could Not Join',
        description: err?.message || 'Unable to join this match.',
        type: 'danger',
      });
    }
  };

  const handleGoToGame = () => {
    if (gameId) {
      onClose();
      navigate(`/games/${gameId}?code=${encodeURIComponent(submittedCode)}`);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Join Match with Invite Code"
      description="Enter the unique 8-character match invite code shared by the host to find and join a private game."
    >
      <div className="space-y-5 pt-2">
        <form onSubmit={handleLookup} className="flex gap-2">
          <Input
            placeholder="e.g. A1B2C3D4"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={16}
            className="font-mono uppercase tracking-widest text-base"
          />
          <Button type="submit" disabled={!code.trim() || isLoading}>
            <Icon name="search" size={16} className="mr-1" />
            Find
          </Button>
        </form>

        {isLoading ? (
          <div className="rounded-xl border border-border p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
            <Skeleton className="h-8 w-24" />
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 text-center space-y-1">
            <p className="text-sm font-semibold text-danger">Game Not Found</p>
            <p className="text-xs text-muted-foreground">
              {(error as any)?.message || `No match could be located for invite code "${submittedCode}".`}
            </p>
          </div>
        ) : game && (game.id || game._id) ? (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground uppercase tracking-wide">
                  {game.sportKey}
                </span>
                <Badge variant="outline" className="text-xs capitalize">
                  {game.formatKey || 'Standard'}
                </Badge>
              </div>
              {isGameCancelled ? (
                <Badge variant="danger">Match Cancelled</Badge>
              ) : (
                <Badge variant="success">Found</Badge>
              )}
            </div>

            {isGameCancelled && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs space-y-1">
                <p className="font-semibold text-danger flex items-center gap-1.5">
                  <Icon name="x-circle" size={14} className="shrink-0" />
                  This match has been cancelled
                </p>
                <p className="text-muted-foreground">
                  The host cancelled this game. New players cannot request or join this match.
                </p>
                {game?.cancellationReason?.reasonText && (
                  <p className="text-muted-foreground italic text-[11px] pt-0.5">
                    &quot;{game.cancellationReason.reasonText}&quot;
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground">Starts:</span>{' '}
                {new Date(game.startsAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium text-foreground">Venue:</span>{' '}
                {game.venueName || game.location?.label || 'Coarsened Community Venue'}
              </p>
              <p>
                <span className="font-medium text-foreground">Capacity:</span>{' '}
                {game.currentPlayersCount ?? (game.participants?.length || 0)} / {game.maxPlayers} players
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={handleGoToGame}>
                {isGameCancelled ? 'View Match' : 'View & Join Match'}
              </Button>
              {isGameCancelled ? (
                <Button size="sm" variant="danger" disabled>
                  <Icon name="x-circle" size={14} className="mr-1" />
                  Match Cancelled
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleJoinGame}
                  isLoading={joinMutation.isPending}
                  rightIcon="chevron-right"
                >
                  {game?.joinPolicy === 'approval' ? 'Request to Join' : '1-Click Join'}
                </Button>
              )}
            </div>
          </div>
        ) : submittedCode ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            Enter an invite code above and click Find.
          </p>
        ) : null}

        <div className="flex justify-end pt-2 border-t border-border-subtle">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
