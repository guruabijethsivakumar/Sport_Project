import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  useOnboardingStatus,
  useSportsCatalog,
  useMyProfile,
  coarsenCoordinates,
  CITIES_CATALOG,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { Wizard, type WizardStep } from '../../components/patterns/Wizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Icon } from '../../components/ui/Icon';
import { FormErrorBanner } from '../../components/patterns/FormPattern';

export function OnboardingPage(): React.ReactElement {
  const { client, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  // Fetch status and catalog
  const { data: statusReport, isLoading: isLoadingStatus } = useOnboardingStatus(client);
  const { data: catalogData } = useSportsCatalog(client);
  const { data: profileData } = useMyProfile(client);

  const sportsList: any[] = useMemo(() => {
    return (catalogData as any)?.sports || (Array.isArray(catalogData) ? catalogData : []);
  }, [catalogData]);

  // Step 0: Basic Info State
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  );

  // Step 1: Sports State
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [selectedBandKey, setSelectedBandKey] = useState<string>('');
  const [playStyle, setPlayStyle] = useState<string>('');

  // Step 2: Location State (Chennai is first by default in catalog)
  const defaultCity = CITIES_CATALOG[0];
  const [selectedCityKey, setSelectedCityKey] = useState<string>(defaultCity.key);
  const [coordinates, setCoordinates] = useState<[number, number]>(defaultCity.coordinates);
  const [locationLabel, setLocationLabel] = useState<string>(defaultCity.label);
  const [travelRadiusKm, setTravelRadiusKm] = useState<number>(15);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  // Step 3: Availability & Visibility State
  const [includeWeekdayEvenings, setIncludeWeekdayEvenings] = useState(true);
  const [includeWeekendMornings, setIncludeWeekendMornings] = useState(true);
  const [includeWeekendAfternoons, setIncludeWeekendAfternoons] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');

  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill when profile data loads
  useEffect(() => {
    if (profileData?.displayName) {
      setDisplayName(profileData.displayName);
    }
    if (profileData?.bio) {
      setBio(profileData.bio);
    }
    if (profileData?.timezone) {
      setTimezone(profileData.timezone);
    }
  }, [profileData]);

  // Set default sport once catalog loads
  useEffect(() => {
    if (sportsList.length > 0 && !selectedSportId) {
      const first = sportsList[0];
      setSelectedSportId(first._id || first.id);
      if (first.skillBands && first.skillBands.length > 0) {
        setSelectedBandKey(first.skillBands[0].key);
      }
    }
  }, [sportsList, selectedSportId]);

  // Calculate resume step
  const initialStep = useMemo(() => {
    if (!statusReport || !statusReport.missingSteps) return 0;
    const missing = statusReport.missingSteps;
    if (missing.includes('basic_info')) return 0;
    if (missing.includes('sports')) return 1;
    if (missing.includes('location')) return 2;
    if (missing.includes('availability') || missing.includes('preferences')) return 3;
    return 0;
  }, [statusReport]);

  // If loading auth session, show spinner
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 max-w-md mx-auto" role="status">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading onboarding session...</p>
      </div>
    );
  }

  // If unauthenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If already complete, redirect to home
  if (!isLoadingStatus && statusReport?.isComplete) {
    return <Navigate to="/" replace />;
  }

  // Geolocation detection handler
  const handleDetectLocation = () => {
    setGeoStatus(null);
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported by your browser. Please select a city below.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coarsened = coarsenCoordinates(pos.coords.longitude, pos.coords.latitude, 2);
        setCoordinates(coarsened);
        setLocationLabel('My Location (Detected & Coarsened)');
        setGeoStatus('Location successfully detected and coarsened for privacy.');
      },
      () => {
        setGeoStatus(
          'Location access was denied or timed out. Please select your city from the list below.'
        );
      },
      { timeout: 8000 }
    );
  };

  const handleCityChange = (cityKey: string) => {
    setSelectedCityKey(cityKey);
    const found = CITIES_CATALOG.find((c) => c.key === cityKey);
    if (found) {
      setCoordinates(found.coordinates);
      setLocationLabel(found.label);
      setGeoStatus(null);
    }
  };

  // Step 0 validation and save
  const handleSaveBasicInfo = async (): Promise<boolean> => {
    setStepError(null);
    if (displayName.trim().length < 2) {
      setStepError('Display name must be at least 2 characters long.');
      return false;
    }

    try {
      setIsSubmitting(true);
      await client.put('/profile/me/basic', {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        timezone,
      });
      return true;
    } catch {
      setStepError('Failed to save basic profile info. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1 validation and save
  const handleSaveSports = async (): Promise<boolean> => {
    setStepError(null);
    if (!selectedSportId) {
      setStepError('Please select at least one sport.');
      return false;
    }
    if (!selectedBandKey) {
      setStepError('Please select your skill band for the chosen sport.');
      return false;
    }

    try {
      setIsSubmitting(true);
      await client.put('/profile/me/sports', {
        sports: [
          {
            sportId: selectedSportId,
            selectedBandKey,
            playStyle: playStyle || null,
            preferredPositions: [],
          },
        ],
      });
      return true;
    } catch {
      setStepError('Failed to save sports preferences. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 validation and save
  const handleSaveLocation = async (): Promise<boolean> => {
    setStepError(null);
    if (!coordinates || coordinates.length !== 2) {
      setStepError('Please select a valid location.');
      return false;
    }

    try {
      setIsSubmitting(true);
      await client.put('/profile/me/location', {
        coordinates,
        locationLabel: locationLabel || defaultCity.label,
        travelRadiusKm: Number(travelRadiusKm) || 15,
      });
      return true;
    } catch {
      setStepError('Failed to save location details. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3 finalization & complete
  const handleCompleteOnboarding = async () => {
    setStepError(null);
    try {
      setIsSubmitting(true);

      // Compute slots
      const slots: Array<{ dayOfWeek: number; startMinute: number; endMinute: number }> = [];
      if (includeWeekdayEvenings) {
        for (let day = 1; day <= 5; day++) {
          slots.push({ dayOfWeek: day, startMinute: 1080, endMinute: 1260 });
        }
      }
      if (includeWeekendMornings) {
        slots.push({ dayOfWeek: 0, startMinute: 480, endMinute: 660 });
        slots.push({ dayOfWeek: 6, startMinute: 480, endMinute: 660 });
      }
      if (includeWeekendAfternoons) {
        slots.push({ dayOfWeek: 0, startMinute: 900, endMinute: 1080 });
        slots.push({ dayOfWeek: 6, startMinute: 900, endMinute: 1080 });
      }

      // 1. Save availability
      await client.put('/profile/me/availability', { slots });

      // 2. Save preferences
      await client.put('/profile/me/preferences', {
        visibility: {
          profile: visibility,
        },
      });

      // 3. Mark onboarding complete
      await client.post('/profile/me/onboarding/complete', {});

      navigate('/', { replace: true });
    } catch {
      setStepError('Failed to complete onboarding. Please verify required fields and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Current sport details
  const activeSport = sportsList.find((s) => (s._id || s.id) === selectedSportId);

  const wizardSteps: WizardStep[] = [
    {
      step: {
        id: 'basic-info',
        title: 'Basic Info',
        description: 'Identity & timezone',
      },
      validate: handleSaveBasicInfo,
      content: (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Tell us about yourself</h2>
          <p className="text-sm text-muted-foreground">
            This information will be displayed to match organizers and ladder participants.
          </p>

          <FormField label="Display Name" id="onboarding-display-name" required>
            <Input
              id="onboarding-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Bio (Optional)" id="onboarding-bio">
            <Input
              id="onboarding-bio"
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Casual badminton player, looking for evening games"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Timezone" id="onboarding-timezone">
            <Input
              id="onboarding-timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Asia/Kolkata"
              disabled={isSubmitting}
            />
          </FormField>
        </div>
      ),
    },
    {
      step: {
        id: 'sports',
        title: 'Sports & Skill',
        description: 'Sport and calibrated tier',
      },
      validate: handleSaveSports,
      content: (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Select your primary sport</h2>
            <p className="text-sm text-muted-foreground">
              Choose the sport you want to compete in and set your starting skill band.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sportsList.map((sport) => {
              const id = sport._id || sport.id;
              const isSelected = selectedSportId === id;
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => {
                    setSelectedSportId(id);
                    if (sport.skillBands && sport.skillBands.length > 0) {
                      setSelectedBandKey(sport.skillBands[0].key);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-sm font-semibold'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon name="trophy" size={20} className="mb-2" />
                  <span>{sport.name}</span>
                </button>
              );
            })}
          </div>

          {activeSport?.skillBands && activeSport.skillBands.length > 0 && (
            <div className="pt-2">
              <label className="text-sm font-medium text-foreground block mb-2">
                Your Initial Skill Band ({activeSport.name})
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeSport.skillBands.map((band: any) => {
                  const isSelected = selectedBandKey === band.key;
                  return (
                    <button
                      type="button"
                      key={band.key}
                      onClick={() => setSelectedBandKey(band.key)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left text-sm transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-card text-foreground hover:bg-muted'
                      }`}
                    >
                      <div>
                        <div className="font-medium capitalize">{band.label || band.key}</div>
                        <div className="text-xs text-muted-foreground">
                          Seed Rating: {band.seedRating}
                        </div>
                      </div>
                      {isSelected && <Icon name="check" size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeSport?.playStyles && activeSport.playStyles.length > 0 && (
            <FormField label="Play Style (Optional)" id="onboarding-playstyle">
              <Select
                value={playStyle}
                onValueChange={setPlayStyle}
                placeholder="Choose play style..."
                options={activeSport.playStyles.map((ps: any) => ({
                  value: ps.key,
                  label: ps.label || ps.key,
                }))}
              />
            </FormField>
          )}
        </div>
      ),
    },
    {
      step: {
        id: 'location',
        title: 'Location',
        description: 'City & travel radius',
      },
      validate: handleSaveLocation,
      content: (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Set your game location</h2>
            <p className="text-sm text-muted-foreground">
              Used for matching nearby games. Coordinates are coarsened (~1.1 km) to protect your
              privacy.
            </p>
          </div>

          {geoStatus && (
            <div className="rounded-lg border border-border bg-muted/60 p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Icon name="info" size={14} className="shrink-0" />
              <span>{geoStatus}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDetectLocation}
              className="flex-1"
            >
              <Icon name="map-pin" size={16} className="mr-2" />
              Use Current Location
            </Button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border-subtle" />
            <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">
              Or pick from regional cities
            </span>
            <div className="flex-grow border-t border-border-subtle" />
          </div>

          <FormField label="Select City" id="onboarding-city">
            <Select
              value={selectedCityKey}
              onValueChange={handleCityChange}
              placeholder="Select city..."
              options={CITIES_CATALOG.map((c) => ({
                value: c.key,
                label: c.label,
              }))}
            />
          </FormField>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="shield-check" size={14} className="text-success" />
            <span>
              Active Location: <strong className="text-foreground">{locationLabel}</strong> (
              {coordinates[0].toFixed(2)}, {coordinates[1].toFixed(2)})
            </span>
          </div>

          <FormField label="Travel Radius (km)" id="onboarding-radius">
            <Select
              value={String(travelRadiusKm)}
              onValueChange={(val) => setTravelRadiusKm(Number(val))}
              placeholder="Select radius..."
              options={[
                { value: '5', label: '5 km (Nearby only)' },
                { value: '10', label: '10 km' },
                { value: '15', label: '15 km (Recommended)' },
                { value: '25', label: '25 km' },
                { value: '50', label: '50 km (Metropolitan)' },
              ]}
            />
          </FormField>
        </div>
      ),
    },
    {
      step: {
        id: 'availability',
        title: 'Availability',
        description: 'Schedule & privacy',
      },
      content: (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              When are you available to play?
            </h2>
            <p className="text-sm text-muted-foreground">
              Select your typical playing times so match recommendations can find compatible games.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground block">Weekly Time Slots</label>

            <button
              type="button"
              onClick={() => setIncludeWeekdayEvenings(!includeWeekdayEvenings)}
              className={`flex w-full items-center justify-between p-3.5 rounded-lg border text-left text-sm transition-all ${
                includeWeekdayEvenings
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              <div>
                <div className="font-semibold">Weekday Evenings</div>
                <div className="text-xs text-muted-foreground">
                  Monday to Friday, 6:00 PM &ndash; 9:00 PM
                </div>
              </div>
              <Icon
                name={includeWeekdayEvenings ? 'check-circle' : 'circle' as any}
                size={18}
              />
            </button>

            <button
              type="button"
              onClick={() => setIncludeWeekendMornings(!includeWeekendMornings)}
              className={`flex w-full items-center justify-between p-3.5 rounded-lg border text-left text-sm transition-all ${
                includeWeekendMornings
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              <div>
                <div className="font-semibold">Weekend Mornings</div>
                <div className="text-xs text-muted-foreground">
                  Saturday &amp; Sunday, 8:00 AM &ndash; 11:00 AM
                </div>
              </div>
              <Icon
                name={includeWeekendMornings ? 'check-circle' : 'circle' as any}
                size={18}
              />
            </button>

            <button
              type="button"
              onClick={() => setIncludeWeekendAfternoons(!includeWeekendAfternoons)}
              className={`flex w-full items-center justify-between p-3.5 rounded-lg border text-left text-sm transition-all ${
                includeWeekendAfternoons
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              <div>
                <div className="font-semibold">Weekend Afternoons</div>
                <div className="text-xs text-muted-foreground">
                  Saturday &amp; Sunday, 3:00 PM &ndash; 6:00 PM
                </div>
              </div>
              <Icon
                name={includeWeekendAfternoons ? 'check-circle' : 'circle' as any}
                size={18}
              />
            </button>
          </div>

          <div className="pt-2">
            <label className="text-sm font-medium text-foreground block mb-2">
              Profile Privacy
            </label>
            <RadioGroup
              value={visibility}
              onValueChange={(val: any) => setVisibility(val)}
              options={[
                {
                  value: 'public',
                  label: 'Public Profile',
                  description: 'Visible to all players on the platform and leaderboards.',
                },
                {
                  value: 'friends',
                  label: 'Registered Players Only',
                  description: 'Visible only to players who are logged into PlayMatch.',
                },
              ]}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="shadow-lg border-border-subtle">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <Icon name="sparkles" size={24} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Player Onboarding Wizard
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Complete your profile setup to join ladder rankings and receive tailored matches.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {stepError && (
            <FormErrorBanner error={stepError} onDismiss={() => setStepError(null)} />
          )}

          <Wizard
            steps={wizardSteps}
            initialStep={initialStep}
            onComplete={handleCompleteOnboarding}
            isSubmitting={isSubmitting}
            completeLabel="Finish Setup"
          />
        </CardContent>
      </Card>
    </div>
  );
}
