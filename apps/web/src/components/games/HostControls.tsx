import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';
import { Select, type SelectOption } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';

export interface HostControlsProps {
  gameId: string;
  gameStatus: string;
  isHost: boolean;
  onCancelGame: (data: { reasonCode: string; reasonText?: string }) => Promise<void>;
  isCancelling?: boolean;
  pendingRequestsCount?: number;
}

const CANCELLATION_REASONS: SelectOption[] = [
  { value: 'host_cancelled', label: 'Host Unable to Attend / Scheduling Conflict' },
  { value: 'weather', label: 'Adverse Weather / Rain' },
  { value: 'venue_unavailable', label: 'Venue or Court Slot Unavailable' },
  { value: 'insufficient_players', label: 'Insufficient Players Joined' },
  { value: 'other', label: 'Other Reason' },
];

export function HostControls({
  gameId,
  gameStatus,
  isHost,
  onCancelGame,
  isCancelling = false,
  pendingRequestsCount = 0,
}: HostControlsProps): React.ReactElement | null {
  const { toast } = useToast();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<string>('host_cancelled');
  const [reasonText, setReasonText] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  if (!isHost) {
    return null;
  }

  const isInactive = gameStatus === 'cancelled' || gameStatus === 'completed' || gameStatus === 'expired';

  const handleConfirmCancel = async () => {
    if (!reasonCode) {
      setValidationError('Please select a cancellation reason code.');
      return;
    }
    setValidationError('');

    try {
      await onCancelGame({
        reasonCode,
        reasonText: reasonText.trim() || undefined,
      });
      setCancelModalOpen(false);
      toast({
        type: 'success',
        title: 'Game Cancelled',
        description: 'The game has been cancelled and participants have been notified.',
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to cancel game. Please try again.';
      toast({
        type: 'danger',
        title: 'Cancellation Failed',
        description: msg,
      });
    }
  };

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="shield-check" className="text-primary" size={18} />
            <CardTitle className="text-base">Host Control Center</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Host Privileges
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending request alert */}
        {pendingRequestsCount > 0 && !isInactive && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="alert-circle" size={16} className="shrink-0" />
              <span>
                You have {pendingRequestsCount} player join request(s) awaiting your decision in the roster.
              </span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        {isInactive ? (
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Icon name="info" size={16} className="shrink-0" />
            <span>
              This match is {gameStatus}. Further host modifications are closed.
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Cancel Match</p>
              <p className="text-xs text-muted-foreground">
                Notify all participants and release reserved court slots immediately.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-danger border-danger/40 hover:bg-danger/10 hover:text-danger shrink-0"
              leftIcon="x-circle"
              onClick={() => {
                setReasonCode('host_cancelled');
                setReasonText('');
                setValidationError('');
                setCancelModalOpen(true);
              }}
              disabled={isCancelling}
            >
              Cancel Match
            </Button>
          </div>
        )}

        {/* Structured Cancellation Dialog */}
        <Dialog
          open={cancelModalOpen}
          onOpenChange={setCancelModalOpen}
          title="Cancel Match"
          description="Are you sure you want to cancel this scheduled game? This action notifies all registered participants and cannot be undone."
        >
          <div className="space-y-4 pt-2">
            <FormField
              id="cancel-reason-code"
              label="Cancellation Reason"
              required
              error={validationError}
            >
              <Select
                value={reasonCode}
                onValueChange={(val) => {
                  setReasonCode(val);
                  setValidationError('');
                }}
                options={CANCELLATION_REASONS}
              />
            </FormField>

            <FormField
              id="cancel-reason-notes"
              label="Additional Message for Players (Optional)"
              helperText="Explain the circumstances to your participants."
            >
              <Textarea
                id="cancel-reason-notes"
                placeholder="e.g. Due to sudden torrential rain, the ground is waterlogged and unplayable."
                rows={3}
                maxLength={500}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
              />
            </FormField>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                disabled={isCancelling}
                onClick={() => setCancelModalOpen(false)}
              >
                Keep Match Active
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isCancelling}
                leftIcon="x-circle"
                onClick={handleConfirmCancel}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Dialog>
      </CardContent>
    </Card>
  );
}
