import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSportsCatalog, usePublicVenues } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Stepper, type StepItem } from '../../components/ui/Stepper';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Select, type SelectOption } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { DateTimeInput } from '../../components/ui/DateTimeInput';
import { RadioGroup, type RadioOption } from '../../components/ui/RadioGroup';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/Dialog';

const WIZARD_STEPS: StepItem[] = [
  { id: 'sport', title: 'Sport & Format' },
  { id: 'datetime', title: 'Date & Time' },
  { id: 'location', title: 'Venue & Location' },
  { id: 'participation', title: 'Rules & Capacity' },
  { id: 'review', title: 'Review & Confirm' },
];

const DURATION_OPTIONS: SelectOption[] = [
  { value: '30', label: '30 Minutes' },
  { value: '60', label: '1 Hour' },
  { value: '90', label: '1.5 Hours' },
  { value: '120', label: '2 Hours' },
  { value: '180', label: '3 Hours' },
];

const JOIN_POLICY_OPTIONS: RadioOption[] = [
  {
    value: 'open',
    label: 'Open Joining',
    description: 'Anyone who meets the rating requirements can instantly join until full.',
  },
  {
    value: 'approval',
    label: 'Host Approval',
    description: 'Players must request to join. You will review and approve their request.',
  },
];

const VISIBILITY_OPTIONS: RadioOption[] = [
  {
    value: 'public',
    label: 'Public Game',
    description: 'Visible in the community discovery feed for players nearby.',
  },
  {
    value: 'private',
    label: 'Private Game',
    description: 'Hidden from discovery. Players join only via an exclusive invite code.',
  },
];

export function CreateGamePage(): React.ReactElement {
  const { client, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [discardModalOpen, setDiscardModalOpen] = useState<boolean>(false);

  // Form State
  const [sportKey, setSportKey] = useState<string>('');
  const [formatKey, setFormatKey] = useState<string>('');
  const [gameDate, setGameDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('60');

  // Location mode: 'venue' or 'custom'
  const [locationMode, setLocationMode] = useState<'venue' | 'custom'>('venue');
  const [venueId, setVenueId] = useState<string>('');
  const [courtId, setCourtId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [customLng, setCustomLng] = useState<string>('80.28');
  const [customLat, setCustomLat] = useState<string>('13.06');

  // Participation & Rules
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval'>('open');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [notes, setNotes] = useState<string>('');

  // Rating Range
  const [hasRatingFilter, setHasRatingFilter] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<string>('1000');
  const [maxRating, setMaxRating] = useState<string>('2000');
  const [allowUnrated, setAllowUnrated] = useState<boolean>(true);

  // Step validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Sports Catalog
  const { data: sportsData } = useSportsCatalog(client);
  const sportsList: any[] = (sportsData as any)?.sports || (sportsData as any)?.data?.sports || [];

  const currentSport = useMemo(() => {
    return sportsList.find((s) => s.key === sportKey);
  }, [sportsList, sportKey]);

  const currentFormat = useMemo(() => {
    return currentSport?.formats?.find((f: any) => f.key === formatKey);
  }, [currentSport, formatKey]);

  const calculatedCapacity = useMemo(() => {
    if (!currentFormat) return 4;
    return 2 * (currentFormat.playersPerSide || 2);
  }, [currentFormat]);

  // 2. Fetch Venues using new usePublicVenues hook (using user profile homeLocation or default Chennai coordinates)
  const userCoords = user?.homeLocation?.coordinates || [80.28, 13.06];
  const { data: venuesData, isLoading: isLoadingVenues } = usePublicVenues(
    client,
    {
      lat: userCoords[1],
      lng: userCoords[0],
      radiusKm: 50,
      sportKey: sportKey || undefined,
    },
    { staleTime: 60000 },
  );

  const venueItems: any[] = (venuesData as any)?.data?.items || (venuesData as any)?.items || [];
  const venueList = useMemo(() => {
    return venueItems.map((item) => item.venue || item);
  }, [venueItems]);

  const currentVenue = useMemo(() => {
    return venueList.find((v) => (v._id || v.id) === venueId);
  }, [venueList, venueId]);

  // Filter courts compatible with the chosen sport
  const availableCourts = useMemo(() => {
    if (!currentVenue || !currentVenue.courts) return [];
    if (!sportKey) return currentVenue.courts.filter((c: any) => c.isActive !== false);
    return currentVenue.courts.filter(
      (c: any) =>
        c.isActive !== false &&
        (!c.sportKeys || c.sportKeys.length === 0 || c.sportKeys.includes(sportKey))
    );
  }, [currentVenue, sportKey]);

  // Calculate formatted start and end ISO strings
  const { startsAtIso, endsAtIso, isPastStart, isEndBeforeStart } = useMemo(() => {
    if (!gameDate || !startTime) {
      return { startsAtIso: null, endsAtIso: null, isPastStart: false, isEndBeforeStart: false };
    }
    const [year, month, day] = gameDate.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    const startObj = new Date(year, month - 1, day, hours, minutes, 0, 0);

    const now = new Date();
    const isPast = startObj.getTime() < now.getTime();

    const durationMs = (Number(durationMinutes) || 60) * 60 * 1000;
    const endObj = new Date(startObj.getTime() + durationMs);
    const isEndBefore = endObj.getTime() <= startObj.getTime();

    return {
      startsAtIso: startObj.toISOString(),
      endsAtIso: endObj.toISOString(),
      isPastStart: isPast,
      isEndBeforeStart: isEndBefore,
    };
  }, [gameDate, startTime, durationMinutes]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!sportKey) errs.sportKey = 'Please select a sport';
    if (!formatKey) errs.formatKey = 'Please select a game format';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!gameDate) errs.gameDate = 'Game date is required';
    if (!startTime) errs.startTime = 'Start time is required';
    if (gameDate && startTime && isPastStart) {
      errs.startTime = 'Game start time cannot be in the past';
    }
    if (isEndBeforeStart) {
      errs.duration = 'End time must be after start time';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (locationMode === 'venue') {
      if (!venueId) errs.venueId = 'Please select an arena or venue';
      if (venueId && availableCourts.length > 0 && !courtId) {
        errs.courtId = 'Please select a court';
      }
    } else {
      if (!customAddress.trim()) errs.customAddress = 'Location address or court name is required';
      const lngNum = Number(customLng);
      const latNum = Number(customLat);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errs.customLng = 'Longitude must be between -180 and 180';
      }
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errs.customLat = 'Latitude must be between -90 and 90';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 4 Validation
  const validateStep4 = (): boolean => {
    const errs: Record<string, string> = {};
    if (visibility === 'public' && hasRatingFilter) {
      const minN = Number(minRating);
      const maxN = Number(maxRating);
      if (isNaN(minN) || minN < 0) errs.minRating = 'Min rating must be 0 or greater';
      if (isNaN(maxN) || maxN < 0) errs.maxRating = 'Max rating must be 0 or greater';
      if (minN > maxN) errs.minRating = 'Min rating cannot exceed max rating';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    setSubmitError(null);
    let isValid = false;
    if (activeStep === 0) isValid = validateStep1();
    else if (activeStep === 1) isValid = validateStep2();
    else if (activeStep === 2) isValid = validateStep3();
    else if (activeStep === 3) isValid = validateStep4();
    else isValid = true;

    if (isValid && activeStep < WIZARD_STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    setErrors({});
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleCreateGame = async () => {
    if (isSubmitting) return;
    setSubmitError(null);

    // Final integrity checks
    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      return;
    }

    if (!startsAtIso || !endsAtIso) {
      setSubmitError('Invalid start or end date timestamps');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        sportKey,
        formatKey,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        joinPolicy,
        visibility,
        notes: notes.trim() || undefined,
      };

      if (visibility === 'public' && hasRatingFilter) {
        payload.ratingRange = {
          min: Number(minRating),
          max: Number(maxRating),
          allowUnrated,
        };
      }

      if (locationMode === 'venue') {
        payload.venueId = venueId;
        if (courtId) {
          payload.courtId = courtId;
          const matchedCourt = currentVenue?.courts?.find(
            (c: any) => c.courtId === courtId || c._id === courtId
          );
          if (matchedCourt) payload.courtName = matchedCourt.name;
        }
      } else {
        payload.location = {
          type: 'Point',
          coordinates: [Number(customLng), Number(customLat)],
          addressName: customAddress.trim(),
        };
      }

      const response = await client.post<any>('/games', payload);
      const createdGame = response?.data || response;
      const createdId = createdGame?.id || createdGame?._id;

      toast({
        type: 'success',
        title: 'Game created successfully!',
        description: `Your ${currentSport?.name || sportKey} match is scheduled.`,
      });

      if (createdId) {
        navigate(`/games/${createdId}`);
      } else {
        navigate('/games');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create game. Please check your schedule and details.';
      setSubmitError(msg);
      toast({
        type: 'danger',
        title: 'Creation Failed',
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDirty = Boolean(
    activeStep > 0 ||
    sportKey ||
    formatKey ||
    gameDate ||
    startTime ||
    notes ||
    venueId ||
    customAddress
  );

  const handleBackClick = () => {
    if (isFormDirty) {
      setDiscardModalOpen(true);
    } else {
      navigate('/games');
    }
  };

  const handleConfirmDiscard = () => {
    setDiscardModalOpen(false);
    navigate('/games');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button with Confirmation to Discard */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleBackClick}
          aria-label="Discard and return to games"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
        >
          <Icon name="arrow-right" size={14} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
          Discard & Return to Games
        </button>
      </div>

      {/* Header */}
      <PageHeader
        title="Schedule a New Game"
        description="Set up match details, select a verified court, configure capacity, and invite players."
      />

      {/* Stepper Progress */}
      <div className="my-8">
        <Stepper
          steps={WIZARD_STEPS}
          activeStep={activeStep}
          onStepClick={(idx) => {
            if (idx < activeStep) setActiveStep(idx);
          }}
        />
      </div>

      {/* Main Form Step Cards */}
      <Card className="p-6 shadow-sm">
        {/* Step 1: Sport & Format */}
        {activeStep === 0 && (
          <div className="space-y-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle>Select Sport & Format</CardTitle>
              <CardDescription>
                Choose from available verified sports and game match formats.
              </CardDescription>
            </CardHeader>

            <FormField
              id="sport-select"
              label="Sport"
              required
              error={errors.sportKey}
              helperText="Only verified sports catalog options are available."
            >
              <Select
                value={sportKey}
                onValueChange={(val) => {
                  setSportKey(val);
                  setFormatKey('');
                  setCourtId('');
                  setErrors((prev) => ({ ...prev, sportKey: '' }));
                }}
                options={sportsList.map((s) => ({ value: s.key, label: s.name || s.key }))}
                placeholder="Choose sport..."
              />
            </FormField>

            {currentSport && (
              <FormField
                id="format-select"
                label="Game Format"
                required
                error={errors.formatKey}
                helperText={`Matches format dictates sides and max players (${calculatedCapacity} players).`}
              >
                <Select
                  value={formatKey}
                  onValueChange={(val) => {
                    setFormatKey(val);
                    setErrors((prev) => ({ ...prev, formatKey: '' }));
                  }}
                  options={(currentSport.formats || []).map((f: any) => ({
                    value: f.key,
                    label: `${f.label || f.key} (${2 * (f.playersPerSide || 1)} max)`,
                  }))}
                  placeholder="Choose format..."
                />
              </FormField>
            )}
          </div>
        )}

        {/* Step 2: Date, Time & Duration */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle>Date & Time</CardTitle>
              <CardDescription>
                Schedule match start time and duration. Times reflect your local device timezone.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="game-date"
                label="Game Date"
                required
                error={errors.gameDate}
              >
                <DateTimeInput
                  id="game-date"
                  type="date"
                  value={gameDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setGameDate(e.target.value);
                    setErrors((prev) => ({ ...prev, gameDate: '' }));
                  }}
                />
              </FormField>

              <FormField
                id="start-time"
                label="Start Time"
                required
                error={errors.startTime}
              >
                <DateTimeInput
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setErrors((prev) => ({ ...prev, startTime: '' }));
                  }}
                />
              </FormField>
            </div>

            <FormField
              id="duration-select"
              label="Match Duration"
              required
              error={errors.duration}
              helperText="Determines calculated game end time for conflict checking."
            >
              <Select
                value={durationMinutes}
                onValueChange={setDurationMinutes}
                options={DURATION_OPTIONS}
              />
            </FormField>

            {startsAtIso && endsAtIso && !isPastStart && (
              <div className="rounded-lg bg-muted/60 p-4 border border-border-subtle flex items-center gap-3">
                <Icon name="clock" className="text-primary shrink-0" size={18} />
                <div className="text-xs text-foreground">
                  <p className="font-semibold">
                    Scheduled Window:{' '}
                    <span className="font-normal">
                      {new Date(startsAtIso).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      —{' '}
                      {new Date(endsAtIso).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    {new Date(startsAtIso).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Venue & Location */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle>Venue & Location</CardTitle>
              <CardDescription>
                Select a verified partner arena or supply a community court location.
              </CardDescription>
            </CardHeader>

            {/* Mode selection tabs */}
            <div className="flex border-b border-border mb-4">
              <button
                type="button"
                onClick={() => {
                  setLocationMode('venue');
                  setErrors({});
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  locationMode === 'venue'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Verified Venue
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationMode('custom');
                  setErrors({});
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  locationMode === 'custom'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Custom Court / Area
              </button>
            </div>

            {locationMode === 'venue' ? (
              <div className="space-y-4">
                <FormField
                  id="venue-select"
                  label="Verified Arena"
                  required
                  error={errors.venueId}
                  helperText={
                    isLoadingVenues
                      ? 'Loading venues nearby...'
                      : `${venueList.length} arenas discovered near your profile area.`
                  }
                >
                  <Select
                    value={venueId}
                    onValueChange={(val) => {
                      setVenueId(val);
                      setCourtId('');
                      setErrors((prev) => ({ ...prev, venueId: '' }));
                    }}
                    options={venueList.map((v) => ({
                      value: v._id || v.id,
                      label: `${v.name} (${v.areaLabel || v.address?.city})`,
                    }))}
                    placeholder="Choose arena..."
                  />
                </FormField>

                {currentVenue && (
                  <div className="space-y-4 pt-2">
                    <FormField
                      id="court-select"
                      label="Court / Pitch Selection"
                      required={availableCourts.length > 0}
                      error={errors.courtId}
                      helperText={
                        availableCourts.length === 0
                          ? 'No specific court slots found for this sport; arena will assign court upon arrival.'
                          : 'Select an active court compatible with your chosen sport.'
                      }
                    >
                      <Select
                        value={courtId}
                        onValueChange={(val) => {
                          setCourtId(val);
                          setErrors((prev) => ({ ...prev, courtId: '' }));
                        }}
                        options={availableCourts.map((c: any) => ({
                          value: c.courtId || c._id,
                          label: `${c.name} (${(c.sportKeys || []).join(', ')})`,
                        }))}
                        placeholder="Choose court..."
                      />
                    </FormField>

                    <div className="rounded-lg border border-border-subtle bg-muted/30 p-3 text-xs space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Icon name="map-pin" size={14} className="text-primary" />
                        {currentVenue.name}
                      </p>
                      <p className="text-muted-foreground">
                        {currentVenue.address?.line1}, {currentVenue.areaLabel},{' '}
                        {currentVenue.address?.city}
                      </p>
                      {currentVenue.weeklyHours && (
                        <p className="text-muted-foreground">
                          Hours: Open daily • Floodlights & facilities verified
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <FormField
                  id="custom-address"
                  label="Court Name or Address"
                  required
                  error={errors.customAddress}
                  helperText="Enter the name or address of the community court or ground."
                >
                  <Input
                    id="custom-address"
                    placeholder="e.g. Marina Public Tennis Grounds, Court 2"
                    value={customAddress}
                    onChange={(e) => {
                      setCustomAddress(e.target.value);
                      setErrors((prev) => ({ ...prev, customAddress: '' }));
                    }}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    id="custom-lat"
                    label="Latitude"
                    required
                    error={errors.customLat}
                  >
                    <Input
                      id="custom-lat"
                      type="number"
                      step="any"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="custom-lng"
                    label="Longitude"
                    required
                    error={errors.customLng}
                  >
                    <Input
                      id="custom-lng"
                      type="number"
                      step="any"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Rules & Capacity */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle>Rules & Participation</CardTitle>
              <CardDescription>
                Configure join policy, visibility, optional Elo skill brackets, and host notes.
              </CardDescription>
            </CardHeader>

            <FormField label="Join Policy" required>
              <RadioGroup
                value={joinPolicy}
                onValueChange={(val) => setJoinPolicy(val as 'open' | 'approval')}
                options={JOIN_POLICY_OPTIONS}
              />
            </FormField>

            <FormField label="Game Visibility" required>
              <RadioGroup
                value={visibility}
                onValueChange={(val) => {
                  const newVis = val as 'public' | 'private';
                  setVisibility(newVis);
                  if (newVis === 'private') {
                    setHasRatingFilter(false);
                  }
                }}
                options={VISIBILITY_OPTIONS}
              />
            </FormField>

            {/* Optional Skill Band / Rating Filter (Public games only) */}
            {visibility === 'public' && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      Filter by Skill / Elo Rating
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Require players to fall within an Elo rating range to join.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHasRatingFilter(!hasRatingFilter)}
                  >
                    {hasRatingFilter ? 'Remove Filter' : 'Enable Range'}
                  </Button>
                </div>

                {hasRatingFilter && (
                  <div className="pt-2 border-t border-border-subtle/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        id="min-rating"
                        label="Minimum Elo"
                        error={errors.minRating}
                      >
                        <Input
                          id="min-rating"
                          type="number"
                          value={minRating}
                          onChange={(e) => setMinRating(e.target.value)}
                        />
                      </FormField>

                      <FormField
                        id="max-rating"
                        label="Maximum Elo"
                        error={errors.maxRating}
                      >
                        <Input
                          id="max-rating"
                          type="number"
                          value={maxRating}
                          onChange={(e) => setMaxRating(e.target.value)}
                        />
                      </FormField>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="allow-unrated"
                        type="checkbox"
                        checked={allowUnrated}
                        onChange={(e) => setAllowUnrated(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor="allow-unrated"
                        className="text-xs font-medium text-foreground cursor-pointer"
                      >
                        Allow unrated players (provisional rating)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <FormField
              id="game-notes"
              label="Host Notes / Instructions"
              helperText="Add equipment requirements, turf shoes reminders, or team guidelines."
            >
              <Input
                id="game-notes"
                placeholder="e.g. Bring own non-marking badminton shoes and Yonex Mavis 350 shuttles"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </FormField>
          </div>
        )}

        {/* Step 5: Review & Confirmation */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <CardHeader className="p-0 pb-2">
              <CardTitle>Review & Confirm Match</CardTitle>
              <CardDescription>
                Verify all game details before publishing to the match schedule.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sport & Format */}
              <div className="rounded-lg border border-border p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sport & Format
                </span>
                <p className="font-bold text-base text-foreground">
                  {currentSport?.name || sportKey}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary">{currentFormat?.label || formatKey}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Capacity: {calculatedCapacity} players
                  </span>
                </div>
              </div>

              {/* Date & Time */}
              <div className="rounded-lg border border-border p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Schedule
                </span>
                <p className="font-bold text-base text-foreground">
                  {gameDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  {startTime} ({durationMinutes} mins)
                </p>
              </div>

              {/* Location */}
              <div className="rounded-lg border border-border p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location & Court
                </span>
                <p className="font-bold text-base text-foreground">
                  {locationMode === 'venue' ? currentVenue?.name : customAddress}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locationMode === 'venue'
                    ? courtId
                      ? `Court: ${
                          currentVenue?.courts?.find(
                            (c: any) => c.courtId === courtId || c._id === courtId
                          )?.name || courtId
                        }`
                      : 'Arena assigned'
                    : `Coordinates: [${customLng}, ${customLat}]`}
                </p>
              </div>

              {/* Rules & Access */}
              <div className="rounded-lg border border-border p-4 space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Access & Policy
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant={joinPolicy === 'open' ? 'success' : 'outline'}>
                    {joinPolicy === 'open' ? 'Instant Join' : 'Approval Required'}
                  </Badge>
                  <Badge variant={visibility === 'public' ? 'info' : 'secondary'}>
                    {visibility === 'public' ? 'Public Discovery' : 'Private Match'}
                  </Badge>
                </div>
                {visibility === 'public' && hasRatingFilter && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Elo range: {minRating} - {maxRating}
                  </p>
                )}
              </div>
            </div>

            {notes && (
              <div className="rounded-lg bg-muted/40 border border-border-subtle p-3 text-xs">
                <span className="font-semibold text-foreground">Notes:</span>{' '}
                <span className="text-muted-foreground">{notes}</span>
              </div>
            )}

            {submitError && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger font-medium flex items-center gap-2">
                <Icon name="alert-circle" size={16} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={activeStep === 0 || isSubmitting}
            leftIcon="arrow-right" // Styled via chevron in layout
          >
            Back
          </Button>

          {activeStep < WIZARD_STEPS.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              rightIcon="chevron-right"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateGame}
              isLoading={isSubmitting}
              leftIcon="check"
            >
              Publish Game
            </Button>
          )}
        </div>
      </Card>

      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        open={discardModalOpen}
        onOpenChange={setDiscardModalOpen}
        title="Discard Draft Game?"
        description="You have unsaved changes in your match configuration. Leaving now will discard your progress and return to the games directory. Are you sure you want to discard?"
        confirmLabel="Discard & Leave"
        cancelLabel="Continue Editing"
        isDestructive
        onConfirm={handleConfirmDiscard}
        onCancel={() => setDiscardModalOpen(false)}
      />
    </div>
  );
}
export default CreateGamePage;
