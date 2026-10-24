import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useMyVenues,
  useMyGames,
  useNotifications,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { AdminDisputeResolver } from '../../components/results/AdminDisputeResolver';

export function AdminDashboardPage(): React.ReactElement {
  const { client, user } = useAuth();
  const { toast } = useToast();

  const userRole = user?.role || 'player';
  const isAdmin = userRole === 'admin' || userRole === 'ADMIN';
  const isVenueOwner = userRole === 'venue_owner' || isAdmin;

  const [userSearch, setUserSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Real backend queries
  const { data: venuesData, isLoading: isLoadingVenues } = useMyVenues(client);
  const { data: myGamesData, isLoading: isLoadingGames } = useMyGames(client);
  const { data: notificationsData, isLoading: isLoadingNotifications } = useNotifications(client);

  // Admin-only platform-wide queries
  const { data: adminStatsData } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => client.get('/admin/dashboard/stats'),
    enabled: isAdmin,
  });

  const { data: adminUsersData, refetch: refetchUsers } = useQuery({
    queryKey: ['admin', 'users', userSearch],
    queryFn: () => client.get(`/admin/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`),
    enabled: isAdmin,
  });

  const _adminStats = (adminStatsData as any)?.data || adminStatsData;
  const adminUsers: any[] = (adminUsersData as any)?.users || (adminUsersData as any)?.data?.users || [];

  const handleToggleSuspend = async (targetUser: any) => {
    try {
      const targetId = targetUser.id || targetUser._id;
      setActionLoadingId(targetId);
      const isSuspended = targetUser.isSuspended;
      if (isSuspended) {
        await client.post(`/admin/users/${targetId}/reinstate`, { reason: 'Account reinstated by administrator' });
        toast({ title: 'User Reinstated', description: `${targetUser.email} has been reinstated.` });
      } else {
        await client.post(`/admin/users/${targetId}/suspend`, { reason: 'Suspended by administrator' });
        toast({ title: 'User Suspended', description: `${targetUser.email} has been suspended.` });
      }
      refetchUsers();
    } catch (err: any) {
      toast({ title: 'Action Failed', description: err?.message || 'Could not update suspension status.', variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    try {
      setActionLoadingId(targetUserId);
      await client.patch(`/admin/users/${targetUserId}/role`, { role: newRole });
      toast({ title: 'Role Updated', description: `User role has been changed to ${newRole}.` });
      refetchUsers();
    } catch (err: any) {
      toast({ title: 'Role Update Failed', description: err?.message || 'Could not update user role.', variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };


  const venueList: any[] = (venuesData as any)?.venues || (venuesData as any)?.data?.venues || [];
  const gamesList: any[] = (myGamesData as any)?.games || (myGamesData as any)?.data || (myGamesData as any)?.items || [];
  const notificationsList: any[] = (notificationsData as any)?.notifications || (notificationsData as any)?.items || [];

  const disputedGames = gamesList.filter(
    (g: any) => g.status === 'disputed' || g.resultStatus === 'disputed'
  );

  const isLoading = isLoadingVenues || isLoadingGames || isLoadingNotifications;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-subtle/50">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Platform Operations Dashboard
            </h1>
            <Badge variant={isAdmin ? 'danger' : isVenueOwner ? 'info' : 'secondary'} className="capitalize">
              {isAdmin ? 'System Admin' : isVenueOwner ? 'Venue Owner' : 'Player Account'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational monitoring, venue facilities, scheduled bookings, and platform activity.
          </p>
        </div>

        {isVenueOwner && (
          <Link to="/venues/manage">
            <Button variant="outline" size="sm" rightIcon="chevron-right">
              Manage Venues
            </Button>
          </Link>
        )}
      </div>

      {/* Real Metric Highlights (strictly from verified backend queries) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">My Managed Venues</p>
          <p className="text-2xl font-bold text-foreground mt-1">{venueList.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isVenueOwner ? 'Facilities configured' : 'Standard player role'}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">My Active Games</p>
          <p className="text-2xl font-bold text-foreground mt-1">{gamesList.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Hosted or joined</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Notifications & Alerts</p>
          <p className="text-2xl font-bold text-foreground mt-1">{notificationsList.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Live event notices</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Disputed Matches</p>
          <p className="text-2xl font-bold text-foreground mt-1">{disputedGames.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting resolution</p>
        </Card>
      </div>

      {/* Section 1: My Managed Facilities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Managed Venues & Facility Overview</CardTitle>
              <CardDescription>
                Venues and arenas registered under your authenticated account.
              </CardDescription>
            </div>
            {isVenueOwner && (
              <Link to="/venues/manage">
                <Button variant="ghost" size="sm" rightIcon="chevron-right">
                  Open Venue Console
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!venueList.length ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-2">
              <Icon name="map-pin" size={24} className="mx-auto text-muted-foreground" />
              <p className="font-semibold text-foreground">No Venues Under Management</p>
              <p>
                {isVenueOwner
                  ? 'You have not registered any arenas yet. Go to Venue Management to register your first facility.'
                  : 'Your account is currently registered as a Player. Venue management is enabled for Venue Owners.'}
              </p>
              {isVenueOwner && (
                <div className="pt-2">
                  <Link to="/venues/manage">
                    <Button variant="outline" size="sm">
                      Register Venue
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {venueList.map((venue: any) => (
                <div
                  key={venue.id || venue._id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{venue.name}</span>
                      <Badge
                        variant={
                          venue.status === 'active'
                            ? 'success'
                            : venue.status === 'suspended'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {venue.status || 'Active'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {venue.address?.line1}, {venue.areaLabel}, {venue.address?.city} •{' '}
                      {venue.courts?.length || 0} courts
                    </p>
                  </div>

                  <Link to="/venues/manage">
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: My Scheduled Matches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Scheduled Games</CardTitle>
          <CardDescription>
            Matches associated with your profile as a host, player, or venue location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!gamesList.length ? (
            <p className="text-xs text-muted-foreground py-2">
              No active games scheduled for this account.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {gamesList.slice(0, 5).map((g: any) => (
                <div
                  key={g.id || g._id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground uppercase">
                        {g.sportKey}
                      </span>
                      <span className="text-muted-foreground font-medium">({g.formatKey})</span>
                      <StatusBadge status={g.status || 'open'} />
                    </div>
                    <p className="text-muted-foreground">
                      {new Date(g.startsAt).toLocaleString()} • {g.venueName || 'Community Ground'}
                    </p>
                  </div>

                  <Link to={`/games/${g.id || g._id}`}>
                    <Button variant="ghost" size="sm" rightIcon="chevron-right">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2.5: Platform User Moderation (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="users" size={18} className="text-primary" />
                  User Moderation & Access Control
                </CardTitle>
                <CardDescription>
                  Search all registered users, manage platform privileges, and handle suspensions.
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {adminUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No users found matching search query.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User / Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.slice(0, 10).map((u: any) => {
                      const uId = u.id || u._id;
                      const isSelf = uId === user?.id;
                      const isPending = actionLoadingId === uId;

                      return (
                        <TableRow key={uId}>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-foreground">{u.name || u.displayName || 'Player'}</p>
                              <p className="text-[11px] text-muted-foreground">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'venue_owner' ? 'info' : 'outline'} className="capitalize">
                              {u.role || 'player'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.isSuspended ? 'danger' : 'success'}>
                              {u.isSuspended ? 'Suspended' : 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {!isSelf && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant={u.isSuspended ? 'outline' : 'danger'}
                                  disabled={isPending}
                                  onClick={() => handleToggleSuspend(u)}
                                >
                                  {u.isSuspended ? 'Reinstate' : 'Suspend'}
                                </Button>
                                {u.role !== 'venue_owner' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => handleUpdateRole(uId, 'venue_owner')}
                                  >
                                    Make Owner
                                  </Button>
                                )}
                                {u.role === 'venue_owner' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => handleUpdateRole(uId, 'player')}
                                  >
                                    Make Player
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 3: Match Disputes & Governance Status */}
      <Card>

        <CardHeader>
          <CardTitle className="text-base">Match Disputes & Governance</CardTitle>
          <CardDescription>
            Contested score proposals and administrative dispute adjudication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!disputedGames.length ? (
            <p className="text-xs text-muted-foreground py-1">
              No active match disputes recorded for your games.
            </p>
          ) : (
            <div className="space-y-3">
              {disputedGames.map((dGame: any) => (
                <div
                  key={dGame.id || dGame._id}
                  className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {dGame.sportKey?.toUpperCase()} match dispute
                    </span>
                    <Badge variant="warning">Contested Result</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Match ID: {dGame.id || dGame._id}. This score proposal has been contested by a player.
                  </p>
                  {isAdmin && (
                    <div className="pt-2">
                      <AdminDisputeResolver gameId={dGame.id || dGame._id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Informative notice on administrative boundaries */}
          {!isAdmin && (
            <div className="rounded-lg bg-muted/40 border border-border-subtle p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Icon name="info" size={14} className="text-primary" />
                Administrative Dispute Governance
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Platform-level dispute force-resolution (upholding contested scores or voiding matches) is securely reserved for system administrators. Players and venue owners can review match timelines, while official overrides are audited by authorized platform adjudicators.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Platform Security & Role Boundaries Notice */}
      <Card className="border-border-subtle/80 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon name="shield-check" size={16} className="text-primary" />
            Security & Permission Boundaries
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p>
            The PlayMatch permission model grants facility control to verified venue owners and match organization tools to hosts. The following privileged platform capabilities are restricted to system administrators in accordance with backend security controls:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Suspending or reinstating arbitrary user accounts</li>
            <li>Modifying global user roles or access tiers</li>
            <li>Platform-wide audit of private user records</li>
            <li>Global administrative venue approval or suspension</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
export default AdminDashboardPage;
