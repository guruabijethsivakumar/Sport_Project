import React, { useState, useMemo } from 'react';
import {
  useMyVenues,
  useSportsCatalog,
  useCreateVenue,
  useUpdateVenue,
  useAddCourt,
  useUpdateCourt,
  useAddClosure,
  useRemoveClosure,
  useVenueAvailability,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { FormField } from '../../components/ui/FormField';
import { Select } from '../../components/ui/Select';
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/Toast';

export function VenueManagementPage(): React.ReactElement {
  const { client, user } = useAuth();
  const { toast } = useToast();

  const isVenueOwner = user?.role === 'venue_owner' || user?.role === 'admin';

  // 1. Fetch user's managed venues
  const {
    data: venuesData,
    isLoading: isLoadingVenues,
    isError: isVenuesError,
    error: venuesError,
    refetch: refetchVenues,
  } = useMyVenues(client);

  const venueList: any[] = (venuesData as any)?.venues || (venuesData as any)?.data?.venues || [];

  // Selected venue state
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  const currentVenue = useMemo(() => {
    if (!venueList.length) return null;
    if (selectedVenueId) {
      return venueList.find((v) => (v.id || v._id) === selectedVenueId) || venueList[0];
    }
    return venueList[0];
  }, [venueList, selectedVenueId]);

  // Sports Catalog for courts
  const { data: sportsData } = useSportsCatalog(client);
  const sportsList: any[] = sportsData?.sports || [];

  // Mutations
  const createVenueMutation = useCreateVenue(client);
  const _updateVenueMutation = useUpdateVenue(client, currentVenue?.id || currentVenue?._id || '');
  const addCourtMutation = useAddCourt(client, currentVenue?.id || currentVenue?._id || '');
  const updateCourtMutation = useUpdateCourt(client, currentVenue?.id || currentVenue?._id || '');
  const addClosureMutation = useAddClosure(client, currentVenue?.id || currentVenue?._id || '');
  const removeClosureMutation = useRemoveClosure(client, currentVenue?.id || currentVenue?._id || '');

  // UI Modals
  const [createVenueOpen, setCreateVenueOpen] = useState(false);
  const [addCourtOpen, setAddCourtOpen] = useState(false);
  const [addClosureOpen, setAddClosureOpen] = useState(false);
  const [closureToDelete, setClosureToDelete] = useState<string | null>(null);

  // Form states - Create Venue
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueDesc, setNewVenueDesc] = useState('');
  const [newVenueLine1, setNewVenueLine1] = useState('');
  const [newVenueCity, setNewVenueCity] = useState('');
  const [newVenueArea, setNewVenueArea] = useState('');
  const [newVenueLng, setNewVenueLng] = useState('80.28');
  const [newVenueLat, setNewVenueLat] = useState('13.06');
  const [newVenueAmenities, setNewVenueAmenities] = useState('parking, water, floodlights');
  const [createVenueError, setCreateVenueError] = useState('');

  // Form states - Add Court
  const [courtName, setCourtName] = useState('');
  const [courtSport, setCourtSport] = useState('');
  const [courtActive, setCourtActive] = useState(true);
  const [addCourtError, setAddCourtError] = useState('');

  // Form states - Add Closure
  const [closureStart, setClosureStart] = useState('');
  const [closureEnd, setClosureEnd] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [closureError, setClosureError] = useState('');

  // Date for checking availability
  const [checkDate, setCheckDate] = useState(() => new Date().toISOString().split('T')[0]);
  const { data: availabilityData, isLoading: isLoadingAvail } = useVenueAvailability(
    client,
    currentVenue?.id || currentVenue?._id || '',
    checkDate
  );

  const availabilityList: any[] = (availabilityData as any)?.data || availabilityData || [];

  // Handlers
  const handleCreateVenue = async () => {
    if (!newVenueName.trim() || !newVenueLine1.trim() || !newVenueCity.trim() || !newVenueArea.trim()) {
      setCreateVenueError('Please complete all required address and venue name fields.');
      return;
    }
    setCreateVenueError('');

    try {
      const payload: any = {
        name: newVenueName.trim(),
        description: newVenueDesc.trim() || `${newVenueName.trim()} sports arena with verified courts.`,
        address: {
          line1: newVenueLine1.trim(),
          city: newVenueCity.trim(),
        },
        areaLabel: newVenueArea.trim(),
        location: {
          type: 'Point',
          coordinates: [Number(newVenueLng) || 80.28, Number(newVenueLat) || 13.06],
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        contactInfo: undefined,
        amenities: newVenueAmenities
          .split(',')
          .map((a) => a.trim().toLowerCase().replace(/\s+/g, '_'))
          .filter(Boolean),
        courts: [
          {
            name: 'Court 1',
            sportKeys: [sportsList[0]?.key || 'badminton'],
            isActive: true,
          },
        ],
      };

      const res = await createVenueMutation.mutateAsync(payload);
      toast({
        type: 'success',
        title: 'Venue Created',
        description: `${newVenueName} has been registered and is pending approval.`,
      });
      setCreateVenueOpen(false);
      refetchVenues();
      if (res?.id || res?._id) {
        setSelectedVenueId(res.id || res._id);
      }
    } catch (err: any) {
      setCreateVenueError(err?.message || 'Failed to create venue. Please check form details.');
    }
  };

  const handleAddCourt = async () => {
    if (!courtName.trim() || !courtSport) {
      setAddCourtError('Court name and sport selection are required.');
      return;
    }
    setAddCourtError('');

    try {
      await addCourtMutation.mutateAsync({
        name: courtName.trim(),
        sportKeys: [courtSport],
        isActive: courtActive,
      });
      toast({
        type: 'success',
        title: 'Court Added',
        description: `${courtName} is now configured for ${currentVenue?.name}.`,
      });
      setAddCourtOpen(false);
      setCourtName('');
      refetchVenues();
    } catch (err: any) {
      setAddCourtError(err?.message || 'Failed to add court.');
    }
  };

  const handleToggleCourtActive = async (court: any) => {
    try {
      await updateCourtMutation.mutateAsync({
        courtId: court.courtId || court._id,
        body: { isActive: !court.isActive },
      });
      toast({
        type: 'info',
        title: 'Court Status Updated',
        description: `${court.name} is now ${!court.isActive ? 'active' : 'inactive'}.`,
      });
      refetchVenues();
    } catch (err: any) {
      toast({
        type: 'danger',
        title: 'Update Failed',
        description: err?.message || 'Could not update court status.',
      });
    }
  };

  const handleAddClosure = async () => {
    if (!closureStart || !closureEnd) {
      setClosureError('Start and end date/times are required.');
      return;
    }
    const sDate = new Date(closureStart);
    const eDate = new Date(closureEnd);
    if (eDate <= sDate) {
      setClosureError('End time must be after start time.');
      return;
    }
    setClosureError('');

    try {
      await addClosureMutation.mutateAsync({
        startsAt: sDate.toISOString(),
        endsAt: eDate.toISOString(),
        reason: closureReason.trim() || 'Court Maintenance',
      });
      toast({
        type: 'success',
        title: 'Maintenance Closure Scheduled',
        description: 'Selected time block will be guarded against new game bookings.',
      });
      setAddClosureOpen(false);
      setClosureStart('');
      setClosureEnd('');
      setClosureReason('');
      refetchVenues();
    } catch (err: any) {
      setClosureError(err?.message || 'Failed to add closure.');
    }
  };

  const handleRemoveClosure = async () => {
    if (!closureToDelete) return;
    try {
      await removeClosureMutation.mutateAsync(closureToDelete);
      toast({
        type: 'info',
        title: 'Closure Removed',
        description: 'The court closure has been removed and availability restored.',
      });
      setClosureToDelete(null);
      refetchVenues();
    } catch (err: any) {
      toast({
        type: 'danger',
        title: 'Error Removing Closure',
        description: err?.message || 'Failed to remove closure.',
      });
    }
  };

  // Loading state
  if (isLoadingVenues) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  // Error state
  if (isVenuesError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <ErrorState
          title="Failed to Load Venues"
          message={venuesError?.message || 'Unable to retrieve your managed venues.'}
          onRetry={refetchVenues}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-subtle/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Venue Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure partner facilities, manage active court slots, schedule maintenance closures, and monitor real-time availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            leftIcon="map-pin"
            onClick={() => {
              setNewVenueName('');
              setNewVenueLine1('');
              setNewVenueCity('');
              setNewVenueArea('');
              setCreateVenueError('');
              setCreateVenueOpen(true);
            }}
          >
            Register Venue
          </Button>
        </div>
      </div>

      {/* Role Notice Banner for Standard Players */}
      {!isVenueOwner && (
        <div className="rounded-xl border border-info/30 bg-info/10 p-4 text-xs text-info flex items-start gap-3">
          <Icon name="info" size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Venue Owner Permissions</p>
            <p className="text-muted-foreground">
              Your account currently holds standard player access. To publicly register partner arenas and monetize court slots on PlayMatch, select Venue Owner during onboarding or contact community operations.
            </p>
          </div>
        </div>
      )}

      {/* Empty State when no venues exist */}
      {venueList.length === 0 ? (
        <EmptyState
          icon="map-pin"
          title="No Venues Registered Yet"
          description="You haven't listed any sports arenas or playing grounds yet. Register your first venue to unlock court scheduling."
          actionLabel="Register First Venue"
          onAction={() => setCreateVenueOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {/* Venue Selector Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="map-pin" size={16} className="text-primary" />
                    <span>{currentVenue?.name}</span>
                    <Badge
                      variant={
                        currentVenue?.status === 'active'
                          ? 'success'
                          : currentVenue?.status === 'suspended'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {currentVenue?.status || 'Active'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {currentVenue?.address?.line1}, {currentVenue?.areaLabel}, {currentVenue?.address?.city}
                  </CardDescription>
                </div>

                {venueList.length > 1 && (
                  <div className="w-56">
                    <Select
                      value={currentVenue?.id || currentVenue?._id}
                      onValueChange={(val) => setSelectedVenueId(val)}
                      options={venueList.map((v) => ({
                        value: v.id || v._id,
                        label: v.name,
                      }))}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                <div className="rounded-lg bg-muted/30 p-3 border border-border-subtle">
                  <p className="text-muted-foreground">Total Courts</p>
                  <p className="text-base font-semibold text-foreground mt-0.5">
                    {currentVenue?.courts?.length || 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 border border-border-subtle">
                  <p className="text-muted-foreground">Active Courts</p>
                  <p className="text-base font-semibold text-success mt-0.5">
                    {currentVenue?.courts?.filter((c: any) => c.isActive !== false).length || 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 border border-border-subtle">
                  <p className="text-muted-foreground">Timezone</p>
                  <p className="text-xs font-semibold text-foreground mt-1 truncate">
                    {currentVenue?.timezone || 'Local'}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 border border-border-subtle">
                  <p className="text-muted-foreground">Coordinates</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    {currentVenue?.location?.coordinates?.join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Courts & Slots Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Courts & Playing Areas</CardTitle>
                  <CardDescription>
                    Active courts are bookable by game hosts for matches and sessions.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon="shield-check"
                  onClick={() => {
                    setCourtName('');
                    setCourtSport(sportsList[0]?.key || 'badminton');
                    setCourtActive(true);
                    setAddCourtError('');
                    setAddCourtOpen(true);
                  }}
                >
                  Add Court
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!currentVenue?.courts?.length ? (
                <EmptyState
                  icon="shield-check"
                  title="No Courts Configured"
                  description="Add at least one court or pitch to make your arena available for games."
                  actionLabel="Add First Court"
                  onAction={() => setAddCourtOpen(true)}
                />
              ) : (
                <div className="divide-y divide-border-subtle">
                  {currentVenue.courts.map((court: any) => (
                    <div
                      key={court.courtId || court._id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {court.name}
                          </span>
                          <Badge variant={court.isActive !== false ? 'success' : 'secondary'}>
                            {court.isActive !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Supported Sports: {(court.sportKeys || []).join(', ') || 'All'}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleCourtActive(court)}
                      >
                        {court.isActive !== false ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Closures & Court Guards */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Maintenance Blocks & Closures</CardTitle>
                  <CardDescription>
                    Schedule court maintenance or weather closures to prevent booking conflicts.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon="calendar"
                  onClick={() => {
                    setClosureStart('');
                    setClosureEnd('');
                    setClosureReason('');
                    setClosureError('');
                    setAddClosureOpen(true);
                  }}
                >
                  Add Closure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!currentVenue?.closures?.length ? (
                <p className="text-xs text-muted-foreground py-2">
                  No active closures or maintenance intervals scheduled. All active courts are available during regular hours.
                </p>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {currentVenue.closures.map((closure: any) => (
                    <div
                      key={closure.closureId || closure._id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">
                          {closure.reason || 'Maintenance Closure'}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(closure.startsAt).toLocaleString()} — {new Date(closure.endsAt).toLocaleString()}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger hover:bg-danger/10"
                        onClick={() => setClosureToDelete(closure.closureId || closure._id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Availability Viewer */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Court Availability Schedule</CardTitle>
                  <CardDescription>
                    Real-time court availability and booked intervals verified by CourtGuard.
                  </CardDescription>
                </div>

                <div className="w-44">
                  <Input
                    type="date"
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAvail ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !availabilityList.length ? (
                <p className="text-xs text-muted-foreground py-2">
                  No availability slots or courts active for {checkDate}.
                </p>
              ) : (
                <div className="space-y-4">
                  {availabilityList.map((cAvail: any) => (
                    <div
                      key={cAvail.courtId}
                      className="rounded-lg border border-border-subtle p-3 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-sm">
                          {cAvail.courtName}
                        </span>
                        <Badge variant="outline">
                          {cAvail.availableSlots?.length || 0} open slots
                        </Badge>
                      </div>

                      {cAvail.bookedIntervals?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="font-medium text-muted-foreground">Booked Matches:</span>
                          <div className="flex flex-wrap gap-2">
                            {cAvail.bookedIntervals.map((b: any, i: number) => (
                              <span
                                key={i}
                                className="rounded bg-muted px-2 py-0.5 text-xs text-foreground font-mono"
                              >
                                {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                                {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Create Venue */}
      <Dialog
        open={createVenueOpen}
        onOpenChange={setCreateVenueOpen}
        title="Register New Sports Arena"
        description="List your verified sports facility on the PlayMatch community discovery feed."
      >
        <div className="space-y-4 pt-2">
          {createVenueError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium flex items-center gap-2">
              <Icon name="alert-circle" size={16} className="shrink-0" />
              <span>{createVenueError}</span>
            </div>
          )}

          <FormField id="venue-name" label="Arena / Ground Name" required>
            <Input
              id="venue-name"
              placeholder="e.g. Marina Smash Badminton Arena"
              value={newVenueName}
              onChange={(e) => setNewVenueName(e.target.value)}
            />
          </FormField>

          <FormField id="venue-desc" label="Description">
            <Textarea
              id="venue-desc"
              rows={2}
              placeholder="Facility details, hardwood flooring, lighting, amenities..."
              value={newVenueDesc}
              onChange={(e) => setNewVenueDesc(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="venue-line1" label="Street Address" required>
              <Input
                id="venue-line1"
                placeholder="e.g. 42 Beach Road"
                value={newVenueLine1}
                onChange={(e) => setNewVenueLine1(e.target.value)}
              />
            </FormField>
            <FormField id="venue-city" label="City" required>
              <Input
                id="venue-city"
                placeholder="e.g. Chennai"
                value={newVenueCity}
                onChange={(e) => setNewVenueCity(e.target.value)}
              />
            </FormField>
          </div>

          <FormField id="venue-area" label="Area / Locality Label" required helperText="Shown in cards and search filters">
            <Input
              id="venue-area"
              placeholder="e.g. Marina Beach"
              value={newVenueArea}
              onChange={(e) => setNewVenueArea(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="venue-lng" label="Longitude" required>
              <Input
                id="venue-lng"
                value={newVenueLng}
                onChange={(e) => setNewVenueLng(e.target.value)}
              />
            </FormField>
            <FormField id="venue-lat" label="Latitude" required>
              <Input
                id="venue-lat"
                value={newVenueLat}
                onChange={(e) => setNewVenueLat(e.target.value)}
              />
            </FormField>
          </div>

          <FormField id="venue-amenities" label="Amenities (comma-separated)">
            <Input
              id="venue-amenities"
              placeholder="parking, floodlights, water, cafe"
              value={newVenueAmenities}
              onChange={(e) => setNewVenueAmenities(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={createVenueMutation.isPending}
              onClick={() => setCreateVenueOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={createVenueMutation.isPending}
              onClick={handleCreateVenue}
            >
              Create Venue
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Add Court */}
      <Dialog
        open={addCourtOpen}
        onOpenChange={setAddCourtOpen}
        title="Add Court / Pitch"
        description="Configure a new playing slot for your facility."
      >
        <div className="space-y-4 pt-2">
          {addCourtError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium flex items-center gap-2">
              <Icon name="alert-circle" size={16} className="shrink-0" />
              <span>{addCourtError}</span>
            </div>
          )}

          <FormField id="court-name" label="Court Name / Number" required>
            <Input
              id="court-name"
              placeholder="e.g. Badminton Court 3"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
            />
          </FormField>

          <FormField id="court-sport" label="Compatible Sport" required>
            <Select
              value={courtSport}
              onValueChange={setCourtSport}
              options={sportsList.map((s) => ({
                value: s.key,
                label: s.name,
              }))}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={addCourtMutation.isPending}
              onClick={() => setAddCourtOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={addCourtMutation.isPending}
              onClick={handleAddCourt}
            >
              Add Court
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Add Closure */}
      <Dialog
        open={addClosureOpen}
        onOpenChange={setAddClosureOpen}
        title="Schedule Maintenance Closure"
        description="Temporarily close courts for scheduled repairs, resurfacing, or tournaments."
      >
        <div className="space-y-4 pt-2">
          {closureError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium flex items-center gap-2">
              <Icon name="alert-circle" size={16} className="shrink-0" />
              <span>{closureError}</span>
            </div>
          )}

          <FormField id="closure-start" label="Closure Start Time" required>
            <Input
              id="closure-start"
              type="datetime-local"
              value={closureStart}
              onChange={(e) => setClosureStart(e.target.value)}
            />
          </FormField>

          <FormField id="closure-end" label="Closure End Time" required>
            <Input
              id="closure-end"
              type="datetime-local"
              value={closureEnd}
              onChange={(e) => setClosureEnd(e.target.value)}
            />
          </FormField>

          <FormField id="closure-reason" label="Reason for Closure">
            <Input
              id="closure-reason"
              placeholder="e.g. Synthetic mat replacement and painting"
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              disabled={addClosureMutation.isPending}
              onClick={() => setAddClosureOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={addClosureMutation.isPending}
              onClick={handleAddClosure}
            >
              Confirm Closure
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm: Delete Closure */}
      <ConfirmDialog
        open={Boolean(closureToDelete)}
        onOpenChange={(open) => !open && setClosureToDelete(null)}
        title="Remove Maintenance Closure"
        description="Are you sure you want to restore regular booking availability for this time slot?"
        confirmLabel="Restore Availability"
        cancelLabel="Keep Closed"
        isLoading={removeClosureMutation.isPending}
        onConfirm={handleRemoveClosure}
      />
    </div>
  );
}
export default VenueManagementPage;
