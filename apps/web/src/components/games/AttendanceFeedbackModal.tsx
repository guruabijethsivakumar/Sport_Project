import React, { useState } from 'react';
import {
  useGameFeedback,
  useSubmitGameFeedback,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toast';

interface Participant {
  userId: string;
  displayName?: string;
  name?: string;
  status?: string;
}

interface AttendanceFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  participants: Participant[];
  hostId: string;
}

export function AttendanceFeedbackModal({
  isOpen,
  onClose,
  gameId,
  participants,
  hostId,
}: AttendanceFeedbackModalProps): React.ReactElement {
  const { client, user } = useAuth();
  const { toast } = useToast();

  const { data: feedbackData, isLoading: isLoadingFeedback, refetch } = useGameFeedback(
    client,
    gameId,
  );

  const submitMutation = useSubmitGameFeedback(client, gameId);

  // Existing feedback records map
  const feedbackList: any[] = (feedbackData as any)?.feedback || (feedbackData as any)?.data?.feedback || [];
  const feedbackMap = new Map<string, any>();
  for (const item of feedbackList) {
    if (item.targetUserId) {
      feedbackMap.set(String(item.targetUserId), item);
    }
  }

  // Eligible participants (excluding host)
  const eligiblePlayers = participants.filter(
    (p) => String(p.userId) !== String(hostId) && p.status !== 'left' && p.status !== 'removed'
  );

  // Form states for players being submitted
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    eligiblePlayers[0]?.userId || ''
  );
  const [attendance, setAttendance] = useState<'attended' | 'no_show'>('attended');
  const [note, setNote] = useState<string>('');
  const [submittingUserId, setSubmittingUserId] = useState<string | null>(null);

  const handleSubmit = async (targetUserId: string) => {
    try {
      setSubmittingUserId(targetUserId);
      await submitMutation.mutateAsync({
        targetUserId,
        attendance,
        note: note.trim() || undefined,
      });

      toast({
        title: 'Attendance Recorded',
        description: `Successfully marked player as ${attendance === 'attended' ? 'Attended' : 'No-Show'}.`,
        variant: 'default',
      });

      setNote('');
      await refetch();
    } catch (err: any) {
      toast({
        title: 'Submission Failed',
        description: err?.message || 'Could not record attendance feedback.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingUserId(null);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Match Attendance & Reliability Feedback"
      description="Verify participant attendance to maintain high community reliability ratings and fair play standards."
    >
      <div className="space-y-6 pt-2">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Icon name="check-circle" size={16} className="text-primary flex-shrink-0" />
          <span>
            Attended players earn 1 reliability credit. No-shows are penalized and affect membership tier status.
          </span>
        </div>

        {eligiblePlayers.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No other registered participants in this match to review.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle max-h-96 overflow-y-auto pr-1">
            {eligiblePlayers.map((player) => {
              const existing = feedbackMap.get(String(player.userId));
              const isSubmitting = submittingUserId === String(player.userId);

              return (
                <div key={player.userId} className="py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar fallbackText={player.displayName || player.name || 'P'} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {player.displayName || player.name || 'Player'}
                        </p>
                        <p className="text-xs text-muted-foreground">ID: {player.userId.slice(-6)}</p>
                      </div>
                    </div>

                    {existing ? (
                      <Badge
                        variant={existing.attendance === 'attended' ? 'success' : 'danger'}
                        className="capitalize"
                      >
                        {existing.attendance === 'attended' ? 'Attended' : 'No Show'}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={selectedPlayerId === player.userId && attendance === 'attended' ? 'primary' : 'outline'}
                          onClick={() => {
                            setSelectedPlayerId(player.userId);
                            setAttendance('attended');
                          }}
                          disabled={isSubmitting}
                        >
                          Attended
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedPlayerId === player.userId && attendance === 'no_show' ? 'danger' : 'outline'}
                          onClick={() => {
                            setSelectedPlayerId(player.userId);
                            setAttendance('no_show');
                          }}
                          disabled={isSubmitting}
                        >
                          No Show
                        </Button>
                      </div>
                    )}
                  </div>

                  {!existing && selectedPlayerId === player.userId && (
                    <div className="mt-2 pl-10 space-y-2">
                      <Input
                        placeholder="Optional note (e.g. arrived on time, great sport...)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="text-xs h-8"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleSubmit(player.userId)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Submitting...' : 'Confirm Status'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border-subtle">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
