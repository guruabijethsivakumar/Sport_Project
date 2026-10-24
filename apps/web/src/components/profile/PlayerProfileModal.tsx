import React from 'react';
import { usePublicProfile, useFeatureReliability } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../ui/Dialog';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface PlayerProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerProfileModal({
  userId,
  isOpen,
  onClose,
}: PlayerProfileModalProps): React.ReactElement | null {
  const { client } = useAuth();

  const {
    data: profileData,
    isLoading: isLoadingProfile,
    error: profileError,
  } = usePublicProfile(client, userId || '', {
    enabled: Boolean(isOpen && userId),
  });

  const {
    data: reliabilityData,
    isLoading: isLoadingReliability,
  } = useFeatureReliability(client, userId || '');

  if (!isOpen || !userId) return null;

  const profile = (profileData as any)?.profile || (profileData as any)?.data || profileData;
  const isPrivate =
    (profileError as any)?.statusCode === 403 ||
    (profileError as any)?.code === 'PROFILE_PRIVATE' ||
    (profileError as any)?.message?.includes('private');

  const isLoading = isLoadingProfile || isLoadingReliability;
  const reliability = (reliabilityData as any)?.reliability || reliabilityData;
  const reliabilityTier: 'bronze' | 'silver' | 'gold' | 'platinum' =
    reliability?.tier || 'silver';

  const tierBadgeVariant: 'default' | 'secondary' | 'warning' | 'outline' =
    reliabilityTier === 'platinum'
      ? 'default'
      : reliabilityTier === 'gold'
      ? 'warning'
      : reliabilityTier === 'silver'
      ? 'secondary'
      : 'outline';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Player Profile"
      description="View player bio, sports ratings, and community reliability tier."
    >
      <div className="space-y-6 pt-1">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : isPrivate ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon name="lock" size={20} />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Private Profile</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                This player has set their profile visibility to private. Their ratings and match history are hidden.
              </p>
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-start gap-4">
              <Avatar fallbackText={profile.displayName || 'P'} size="lg" />
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {profile.displayName || 'Anonymous Player'}
                  </h3>
                  <Badge variant={tierBadgeVariant} className="capitalize text-xs">
                    {reliabilityTier} Member
                  </Badge>
                </div>
                {profile.bio ? (
                  <p className="text-xs text-muted-foreground">{profile.bio}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No bio provided</p>
                )}
                {profile.location?.label && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Icon name="map-pin" size={12} />
                    <span>{profile.location.label}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Attendance Reliability snapshot */}
            <div className="rounded-xl border border-border-subtle bg-muted/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Attendance Reliability</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-bold text-foreground">
                    {reliability?.score ?? 100}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                <p>Matches: <span className="font-semibold text-foreground">{reliability?.gamesCounted ?? 0}</span></p>
                <p>No-shows: <span className="font-semibold text-foreground">{reliability?.noShows ?? 0}</span></p>
              </div>
            </div>

            {/* Configured Sports & Ratings */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sports & Calibrated Ratings
              </p>
              {profile.sports && profile.sports.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {profile.sports.map((sp: any) => (
                    <div
                      key={sp.sport?.id || sp.sport?.key || sp.bandKey}
                      className="rounded-lg border border-border p-3 space-y-1 bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground capitalize">
                          {sp.sport?.name || sp.sport?.key || 'Sport'}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {sp.bandLabel || sp.bandKey || 'Unranked'}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        {sp.rating ? Math.round(sp.rating) : 'Uncalibrated'}{' '}
                        <span className="text-[11px] font-normal text-muted-foreground">Elo</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No public sport ratings listed.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Player details could not be found.
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-border-subtle">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
