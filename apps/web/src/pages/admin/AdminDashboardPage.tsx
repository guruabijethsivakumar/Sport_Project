import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMyVenues,
  useMyGames,
  useNotifications,
  useAdminDashboardStats,
  useAdminDisputes,
  useAdminAllVenues,
  useApproveVenue,
  useSuspendVenue,
  useReinstateVenue,
  useAdminSports,
  useCreateSport,
  useUpdateSport,
  queryKeys,
} from '@playmatch/shared';
import type {
  AdminDashboardStats,
  AdminSport,
  CreateSportPayload,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { Tabs } from '../../components/ui/Tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { AdminDisputeResolver } from '../../components/results/AdminDisputeResolver';

// ─────────────────────────────────────────────────────────────────────────────
// Venue Moderation Panel (admin-only)
// ─────────────────────────────────────────────────────────────────────────────

function VenueModerationPanel({ client }: { client: any }): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [venueFilter, setVenueFilter] = useState<string | undefined>(undefined);
  const [loadingVenueId, setLoadingVenueId] = useState<string | null>(null);

  const { data: venuesData, isLoading } = useAdminAllVenues(client, venueFilter ? { status: venueFilter } : undefined);
  const approveVenue = useApproveVenue(client);
  const suspendVenue = useSuspendVenue(client);
  const reinstateVenue = useReinstateVenue(client);

  const allVenues: any[] = (venuesData as any)?.venues || (venuesData as any)?.data?.venues || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.venuesAll() });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
    queryClient.invalidateQueries({ queryKey: queryKeys.venues.all });
  };

  const handleApprove = async (venueId: string) => {
    setLoadingVenueId(venueId);
    try {
      await approveVenue.mutateAsync(venueId);
      toast({ title: 'Venue Approved', description: 'The venue is now active on the platform.' });
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Approval Failed', description: err?.message || 'Could not approve venue.', variant: 'destructive' });
    } finally {
      setLoadingVenueId(null);
    }
  };

  const handleSuspend = async (venueId: string) => {
    setLoadingVenueId(venueId);
    try {
      await suspendVenue.mutateAsync(venueId);
      toast({ title: 'Venue Suspended', description: 'The venue has been suspended.' });
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Suspension Failed', description: err?.message || 'Could not suspend venue.', variant: 'destructive' });
    } finally {
      setLoadingVenueId(null);
    }
  };

  const handleReinstate = async (venueId: string) => {
    setLoadingVenueId(venueId);
    try {
      await reinstateVenue.mutateAsync(venueId);
      toast({ title: 'Venue Reinstated', description: 'The venue has been reinstated.' });
      invalidateAll();
    } catch (err: any) {
      toast({ title: 'Reinstatement Failed', description: err?.message || 'Could not reinstate venue.', variant: 'destructive' });
    } finally {
      setLoadingVenueId(null);
    }
  };

  const filterButtons: Array<{ label: string; value: string | undefined; icon: string }> = [
    { label: 'All', value: undefined, icon: 'list' },
    { label: 'Pending', value: 'pending_approval', icon: 'clock' },
    { label: 'Active', value: 'active', icon: 'check-circle' },
    { label: 'Suspended', value: 'suspended', icon: 'ban' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mr-1">Filter:</span>
        {filterButtons.map((fb) => (
          <Button
            key={fb.label}
            size="sm"
            variant={venueFilter === fb.value ? 'primary' : 'outline'}
            onClick={() => setVenueFilter(fb.value)}
            leftIcon={fb.icon as any}
          >
            {fb.label}
          </Button>
        ))}
      </div>

      {/* Venues Table */}
      {allVenues.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground space-y-2">
          <Icon name="building" size={28} className="mx-auto text-muted-foreground" />
          <p className="font-semibold text-foreground">No Venues Found</p>
          <p>No venues match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Venue Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Courts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allVenues.map((venue: any) => {
                const vId = venue.id || venue._id;
                const isPending = loadingVenueId === vId;
                const status = venue.status || 'active';

                return (
                  <TableRow key={vId}>
                    <TableCell>
                      <p className="font-semibold text-foreground">{venue.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-muted-foreground">{venue.ownerName || venue.ownerId || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-muted-foreground">
                        {venue.areaLabel || venue.address?.city || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{venue.courts?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === 'active'
                            ? 'success'
                            : status === 'suspended'
                            ? 'danger'
                            : 'warning'
                        }
                        className="capitalize"
                      >
                        {status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status === 'pending_approval' && (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isPending}
                            onClick={() => handleApprove(vId)}
                            leftIcon="check"
                          >
                            Approve
                          </Button>
                        )}
                        {status === 'active' && (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={isPending}
                            onClick={() => handleSuspend(vId)}
                            leftIcon="ban"
                          >
                            Suspend
                          </Button>
                        )}
                        {status === 'suspended' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleReinstate(vId)}
                            leftIcon="power"
                          >
                            Reinstate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sport Catalog Management Panel (admin-only)
// ─────────────────────────────────────────────────────────────────────────────

function SportCatalogPanel({ client }: { client: any }): React.ReactElement {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sportsData, isLoading } = useAdminSports(client);
  const createSport = useCreateSport(client);
  const updateSport = useUpdateSport(client);

  const sportsList: AdminSport[] = (sportsData as any)?.sports || [];

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);

  // Create form state
  const [newSport, setNewSport] = useState({
    key: '',
    name: '',
    minPlayers: 2,
    maxPlayers: 10,
    isActive: true,
  });

  // Edit form state
  const [editData, setEditData] = useState<{
    name?: string;
    isActive?: boolean;
    minPlayers?: number;
    maxPlayers?: number;
  }>({});

  const invalidateSports = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.sports() });
    queryClient.invalidateQueries({ queryKey: queryKeys.sports.all });
  };

  const handleCreate = async () => {
    if (!newSport.key || !newSport.name) {
      toast({ title: 'Validation Error', description: 'Sport key and name are required.', variant: 'destructive' });
      return;
    }
    try {
      const payload: CreateSportPayload = {
        key: newSport.key.toLowerCase().replace(/\s+/g, '-'),
        name: newSport.name,
        minPlayers: newSport.minPlayers,
        maxPlayers: newSport.maxPlayers,
        isActive: newSport.isActive,
        skillBands: [
          { key: 'beginner', label: 'Beginner', order: 1, seedRating: 800 },
          { key: 'intermediate', label: 'Intermediate', order: 2, seedRating: 1200 },
          { key: 'advanced', label: 'Advanced', order: 3, seedRating: 1600 },
        ],
        playStyles: [
          { key: 'casual', label: 'Casual' },
          { key: 'competitive', label: 'Competitive' },
        ],
      };
      await createSport.mutateAsync(payload);
      toast({ title: 'Sport Created', description: `${newSport.name} has been added to the catalog.` });
      setShowCreateForm(false);
      setNewSport({ key: '', name: '', minPlayers: 2, maxPlayers: 10, isActive: true });
      invalidateSports();
    } catch (err: any) {
      toast({ title: 'Creation Failed', description: err?.message || 'Could not create sport.', variant: 'destructive' });
    }
  };

  const handleUpdate = async (sportId: string) => {
    try {
      await updateSport.mutateAsync({ sportId, body: editData });
      toast({ title: 'Sport Updated', description: 'Sport configuration has been saved.' });
      setEditingSportId(null);
      setEditData({});
      invalidateSports();
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err?.message || 'Could not update sport.', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (sport: AdminSport) => {
    const sportId = sport.id || sport._id || '';
    try {
      await updateSport.mutateAsync({ sportId, body: { isActive: !sport.isActive } });
      toast({
        title: sport.isActive ? 'Sport Deactivated' : 'Sport Activated',
        description: `${sport.name} is now ${sport.isActive ? 'inactive' : 'active'}.`,
      });
      invalidateSports();
    } catch (err: any) {
      toast({ title: 'Toggle Failed', description: err?.message || 'Could not toggle sport status.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Sport Action */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sportsList.length} sport{sportsList.length !== 1 ? 's' : ''} in catalog
        </p>
        <Button
          size="sm"
          variant={showCreateForm ? 'outline' : 'primary'}
          leftIcon={showCreateForm ? 'x' : 'plus'}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Add Sport'}
        </Button>
      </div>

      {/* Inline Create Form */}
      {showCreateForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="plus-circle" size={16} className="text-primary" />
              New Sport Entry
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Sport Key</label>
                <Input
                  placeholder="e.g. table-tennis"
                  value={newSport.key}
                  onChange={(e) => setNewSport({ ...newSport, key: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Display Name</label>
                <Input
                  placeholder="e.g. Table Tennis"
                  value={newSport.name}
                  onChange={(e) => setNewSport({ ...newSport, name: e.target.value })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Min Players</label>
                <Input
                  type="number"
                  value={newSport.minPlayers}
                  onChange={(e) => setNewSport({ ...newSport, minPlayers: Number(e.target.value) })}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Max Players</label>
                <Input
                  type="number"
                  value={newSport.maxPlayers}
                  onChange={(e) => setNewSport({ ...newSport, maxPlayers: Number(e.target.value) })}
                  className="text-xs h-8"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                leftIcon="check"
                onClick={handleCreate}
                disabled={createSport.isPending}
              >
                {createSport.isPending ? 'Creating…' : 'Create Sport'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sports List */}
      {sportsList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground space-y-2">
          <Icon name="trophy" size={28} className="mx-auto text-muted-foreground" />
          <p className="font-semibold text-foreground">No Sports Registered</p>
          <p>Add your first sport to the platform catalog.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Sport</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Formats</TableHead>
                <TableHead>Bands</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sportsList.map((sport) => {
                const sId = sport.id || sport._id || sport.key;
                const isEditing = editingSportId === sId;

                return (
                  <TableRow key={sId}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.name ?? sport.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="text-xs h-7 w-32"
                        />
                      ) : (
                        <p className="font-semibold text-foreground">{sport.name}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">
                        {sport.key}
                      </code>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={editData.minPlayers ?? sport.minPlayers}
                            onChange={(e) => setEditData({ ...editData, minPlayers: Number(e.target.value) })}
                            className="text-xs h-7 w-14"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="number"
                            value={editData.maxPlayers ?? sport.maxPlayers}
                            onChange={(e) => setEditData({ ...editData, maxPlayers: Number(e.target.value) })}
                            className="text-xs h-7 w-14"
                          />
                        </div>
                      ) : (
                        <span>{sport.minPlayers}–{sport.maxPlayers}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sport.formats?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sport.skillBands?.length || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sport.isActive ? 'success' : 'secondary'}>
                        {sport.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              leftIcon="check"
                              disabled={updateSport.isPending}
                              onClick={() => handleUpdate(sId)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSportId(null);
                                setEditData({});
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon="pencil"
                              onClick={() => {
                                setEditingSportId(sId);
                                setEditData({
                                  name: sport.name,
                                  minPlayers: sport.minPlayers,
                                  maxPlayers: sport.maxPlayers,
                                  isActive: sport.isActive,
                                });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={sport.isActive ? 'danger' : 'outline'}
                              leftIcon={sport.isActive ? 'toggle-right' : 'toggle-left'}
                              onClick={() => handleToggleActive(sport)}
                            >
                              {sport.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Admin Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminDashboardPage(): React.ReactElement {
  const { client, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userRole = user?.role || 'player';
  const isAdmin = userRole === 'admin' || userRole === 'ADMIN';
  const isVenueOwner = userRole === 'venue_owner' || isAdmin;

  const [userSearch, setUserSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Real backend queries (non-admin)
  const { data: venuesData, isLoading: isLoadingVenues } = useMyVenues(client);
  const { data: myGamesData, isLoading: isLoadingGames } = useMyGames(client);
  const { data: notificationsData, isLoading: isLoadingNotifications } = useNotifications(client);

  // Admin-only hooks — Sprint 2 typed hooks
  const { data: adminStats, isLoading: isLoadingAdminStats } = useAdminDashboardStats(client, { enabled: isAdmin });
  const { data: adminDisputesData, refetch: refetchDisputes } = useAdminDisputes(client, undefined, { enabled: isAdmin });

  const { data: adminUsersData, refetch: refetchUsers } = useAdminAllVenues(client); // re-use for users if needed
  // Direct user search query (not refactored from Sprint 1 — keep inline for user moderation)
  const { data: adminUsersSearchData, refetch: refetchUsersSearch } = useMyGames(client); // placeholder, we use raw query below

  // Raw admin queries for user moderation (kept from existing code)
  const { data: rawAdminUsersData, refetch: refetchAdminUsers } = React.useMemo(() => {
    // We'll keep this inline since user moderation wasn't part of Sprint 2 scope
    return { data: undefined, refetch: () => {} };
  }, []);

  // Use the typed stats from the admin hook
  const _adminStats: AdminDashboardStats | undefined = (adminStats as any);

  // Admin users query (kept inline from original for user moderation panel)
  const [adminUsersQueryData, setAdminUsersQueryData] = useState<any[]>([]);
  const [adminUsersRefetch, setAdminUsersRefetch] = useState<(() => void) | null>(null);

  // Direct admin users fetch for user moderation
  React.useEffect(() => {
    if (!isAdmin) return;
    const fetchUsers = async () => {
      try {
        const res = await client.get(`/admin/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`);
        const data = (res as any)?.data || res;
        setAdminUsersQueryData(data?.users || []);
      } catch {
        setAdminUsersQueryData([]);
      }
    };
    fetchUsers();
    setAdminUsersRefetch(() => fetchUsers);
  }, [isAdmin, userSearch, client]);

  const adminUsers = adminUsersQueryData;

  const rawAdminDisputes: any[] =
    (adminDisputesData as any)?.disputes || [];

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
      adminUsersRefetch?.();
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
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
      adminUsersRefetch?.();
    } catch (err: any) {
      toast({ title: 'Role Update Failed', description: err?.message || 'Could not update user role.', variant: 'destructive' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const venueList: any[] = (venuesData as any)?.venues || (venuesData as any)?.data?.venues || [];
  const gamesList: any[] = (myGamesData as any)?.games || (myGamesData as any)?.data || (myGamesData as any)?.items || [];
  const notificationsList: any[] = (notificationsData as any)?.notifications || (notificationsData as any)?.items || [];

  const myDisputedGames = gamesList.filter(
    (g: any) => g.status === 'disputed' || g.resultStatus === 'disputed'
  );

  const displayedDisputes = isAdmin ? rawAdminDisputes : myDisputedGames;

  const isLoading = isLoadingVenues || isLoadingGames || isLoadingNotifications || (isAdmin && isLoadingAdminStats);

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

  // ─── Build Tab Items ─────────────────────────────────────────────────────

  const overviewTab = (
    <div className="space-y-6">
      {/* Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Platform Users</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {_adminStats?.users?.total ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {_adminStats?.users?.active ?? 0} active • {_adminStats?.users?.suspended ?? 0} suspended
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Platform Matches</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {_adminStats?.games?.total ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {_adminStats?.games?.open ?? 0} open • {_adminStats?.games?.completed ?? 0} completed
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Registered Venues</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {_adminStats?.venues?.total ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {_adminStats?.venues?.pendingApproval ?? 0} pending review • {_adminStats?.venues?.active ?? 0} active
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Disputed Matches</p>
              <p className="text-2xl font-bold text-danger mt-1">
                {_adminStats?.disputes?.open ?? displayedDisputes.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting resolution</p>
            </Card>
          </>
        ) : (
          <>
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
              <p className="text-2xl font-bold text-foreground mt-1">{displayedDisputes.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting resolution</p>
            </Card>
          </>
        )}
      </div>

      {/* Managed Venues Section */}
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

      {/* Recent Games */}
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
    </div>
  );

  const disputesTab = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Match Disputes & Governance</CardTitle>
        <CardDescription>
          Contested score proposals and administrative dispute adjudication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!displayedDisputes.length ? (
          <p className="text-xs text-muted-foreground py-1">
            {isAdmin
              ? 'No contested match disputes currently pending on the platform.'
              : 'No active match disputes recorded for your games.'}
          </p>
        ) : (
          <div className="space-y-3">
            {displayedDisputes.map((dGame: any) => {
              const gameIdentifier = dGame.gameId || dGame.game || dGame.id || dGame._id;
              const sportLabel = dGame.sportKey || dGame.sport || 'Match';
              const reasonText = dGame.disputeReason || dGame.reason || dGame.disputeNotes;

              return (
                <div
                  key={dGame.id || dGame._id || gameIdentifier}
                  className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground uppercase">
                      {sportLabel} Match Dispute
                    </span>
                    <Badge variant="warning">Contested Result</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Match ID: <span className="font-mono text-foreground">{gameIdentifier}</span>.
                    {reasonText ? ` Reason: ${reasonText}` : ' This score proposal has been contested by a player.'}
                  </p>
                  {isAdmin && (
                    <div className="pt-2">
                      <AdminDisputeResolver
                        gameId={String(gameIdentifier)}
                        onResolved={() => {
                          refetchDisputes();
                          queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
  );

  const userModerationTab = (
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
  );

  // Build tabs array
  const tabItems = [
    { value: 'overview', label: 'Overview', content: overviewTab },
    { value: 'disputes', label: `Disputes${displayedDisputes.length ? ` (${displayedDisputes.length})` : ''}`, content: disputesTab },
  ];

  if (isAdmin) {
    tabItems.push(
      { value: 'users', label: 'User Moderation', content: userModerationTab },
      {
        value: 'venues',
        label: `Venue Moderation${_adminStats?.venues?.pendingApproval ? ` (${_adminStats.venues.pendingApproval})` : ''}`,
        content: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon name="building" size={18} className="text-primary" />
                <div>
                  <CardTitle className="text-base">Venue Moderation & Approval</CardTitle>
                  <CardDescription>
                    Review, approve, suspend, or reinstate registered venues on the platform.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VenueModerationPanel client={client} />
            </CardContent>
          </Card>
        ),
      },
      {
        value: 'sports',
        label: 'Sport Catalog',
        content: (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon name="trophy" size={18} className="text-primary" />
                <div>
                  <CardTitle className="text-base">Sport Catalog Management</CardTitle>
                  <CardDescription>
                    View, create, edit, and toggle platform sports including formats and skill bands.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SportCatalogPanel client={client} />
            </CardContent>
          </Card>
        ),
      },
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

      {/* Tabbed Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={tabItems}
      />

      {/* Security Notice */}
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
