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
import { useAuth } from '../../auth/AuthContext';
import { useVenueSuggestions, type VenueSuggestionItem } from '@playmatch/shared';
import { Skeleton } from '../ui/Skeleton';

export interface HostControlsProps {
  gameId: string;
  gameStatus: string;
  isHost: boolean;
  onCancelGame: (data: { reasonCode: string; reasonText?: string }) => Promise<void>;
  isCancelling?: boolean;
  pendingRequestsCount?: number;
  onVenueSelected?: (venueId: string, courtId?: string) => Promise<void>;
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
  onVenueSelected,
}: HostControlsProps): React.ReactElement | null {
  const { client } = useAuth();
  const { toast } = useToast();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<VenueSuggestionItem | null>(null);
  const [isApplyingVenue, setIsApplyingVenue] = useState(false);
  const [reasonCode, setReasonCode] = useState<string>('host_cancelled');
  const [reasonText, setReasonText] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Fetch venue suggestions when modal is open
  const {
    data: suggestions,
    isLoading: isLoadingSuggestions,
    isError: isSuggestionsError,
    error: suggestionsError,
    refetch: refetchSuggestions,
  } = useVenueSuggestions(client, gameId, {
    enabled: suggestionsModalOpen,
  });

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
          <div className="space-y-4 pt-1">
            {/* Suggest Best Venue action (Smart Matchmaking) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Icon name="sparkles" className="text-primary" size={16} />
                  Smart Midpoint Venue Suggestions
                </p>
                <p className="text-xs text-muted-foreground">
                  Calculate the fair geographical centroid for confirmed participants and verify court availability.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                className="shrink-0"
                leftIcon="map-pin"
                onClick={() => {
                  setSuggestionsModalOpen(true);
                  refetchSuggestions();
                }}
              >
                Suggest Best Venue
              </Button>
            </div>

            {/* Cancel Match action */}
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
          </div>
        )}

        {/* Smart Venue Suggestions Dialog */}
        <Dialog
          open={suggestionsModalOpen}
          onOpenChange={setSuggestionsModalOpen}
          title="Smart Venue Suggestions (Centroid Matchmaking)"
          description="Venues ranked by minimum travel distance for your current confirmed participants, filtered by court availability."
        >
          <div className="space-y-4 pt-2">
            {isLoadingSuggestions ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : isSuggestionsError ? (
              <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-xs text-danger space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Icon name="alert-circle" size={16} />
                  Unable to Generate Venue Suggestions
                </p>
                <p>
                  {(suggestionsError as any)?.message ||
                    'At least 4 participants with visible home locations are required to compute a balanced midpoint.'}
                </p>
              </div>
            ) : !suggestions || suggestions.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground space-y-2">
                <Icon name="map-pin" size={28} className="mx-auto text-muted-foreground/60" />
                <p className="font-semibold text-foreground text-sm">No Matching Venues Found</p>
                <p>
                  No active venues supporting this sport were found within the travel radius of your roster midpoint.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {suggestions.map((item, idx) => {
                  const isSelected = selectedSuggestion?.venue.id === item.venue.id;
                  return (
                    <div
                      key={item.venue.id || idx}
                      onClick={() => setSelectedSuggestion(item)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border/80 bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-foreground">
                              {item.venue.name}
                            </h4>
                            {idx === 0 && (
                              <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                                Top Centroid Fit
                              </Badge>
                            )}
                            {item.availableAtTime && (
                              <Badge variant="success" className="text-[10px]">
                                Court Available
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.venue.areaLabel || item.venue.address?.city || 'Local area'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {item.averageDistanceKm.toFixed(1)} km
                          </span>
                          <p className="text-[10px] text-muted-foreground">avg player dist</p>
                        </div>
                      </div>

                      {/* Reasons & Metrics */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5">
                          <Icon name="users" size={12} />
                          {item.participantsCounted} players counted
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5">
                          Max dist: {item.maxDistanceKm.toFixed(1)} km
                        </span>
                        {item.reasons?.map((reason, rIdx) => (
                          <span
                            key={rIdx}
                            className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-2 py-0.5 font-medium"
                          >
                            <Icon name="check" size={12} />
                            {reason.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSuggestionsModalOpen(false);
                  setSelectedSuggestion(null);
                }}
              >
                Close
              </Button>
              {onVenueSelected && (
                <Button
                  type="button"
                  variant="primary"
                  leftIcon="check-circle"
                  disabled={!selectedSuggestion || isApplyingVenue}
                  isLoading={isApplyingVenue}
                  onClick={async () => {
                    if (!selectedSuggestion) return;
                    setIsApplyingVenue(true);
                    try {
                      await onVenueSelected(selectedSuggestion.venue.id);
                      setSuggestionsModalOpen(false);
                      toast({
                        type: 'success',
                        title: 'Venue Updated',
                        description: `Updated match location to ${selectedSuggestion.venue.name}.`,
                      });
                    } catch (err: any) {
                      toast({
                        type: 'danger',
                        title: 'Failed to Update Venue',
                        description: err?.message || 'Could not assign the selected venue.',
                      });
                    } finally {
                      setIsApplyingVenue(false);
                    }
                  }}
                >
                  Select & Update Match Venue
                </Button>
              )}
            </div>
          </div>
        </Dialog>

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
