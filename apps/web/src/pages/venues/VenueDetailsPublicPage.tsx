import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicVenueDetail } from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { PageLayout } from '../../components/patterns';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : m;
  return `${displayH}:${displayM} ${ampm}`;
}

export function VenueDetailsPublicPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const { client } = useAuth();

  const {
    data: venue,
    isLoading,
    isError,
    error,
    refetch,
  } = usePublicVenueDetail(client, id || '');

  if (isLoading) {
    return (
      <PageLayout maxWidth="xl">
        <div className="space-y-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (isError || !venue) {
    return (
      <PageLayout maxWidth="xl">
        <ErrorState
          title="Venue Not Found"
          message={(error as any)?.message || 'The requested venue profile could not be loaded.'}
          onRetry={() => refetch()}
        />
      </PageLayout>
    );
  }

  const defaultPhoto =
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80';
  const mainPhoto = venue.photoUrls && venue.photoUrls.length > 0 ? venue.photoUrls[0] : defaultPhoto;
  const courts = venue.courts || [];

  return (
    <PageLayout maxWidth="xl">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-md">
        <div className="relative h-72 sm:h-96 w-full">
          <img
            src={mainPhoto}
            alt={venue.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Top Navigation / Breadcrumb */}
          <div className="absolute top-4 left-4 z-10">
            <Link to="/venues">
              <Button variant="outline" size="sm" className="bg-black/40 text-white border-white/20 hover:bg-black/60">
                Back to All Venues
              </Button>
            </Link>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs uppercase font-bold tracking-wider">
                  {venue.areaLabel || venue.address?.city}
                </Badge>
                {venue.status === 'active' && (
                  <Badge variant="success" className="text-xs">
                    Verified Partner
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {venue.name}
              </h1>
              <p className="text-sm text-gray-200 flex items-center gap-1.5">
                <Icon name="map-pin" size={16} className="text-primary" />
                {venue.address?.line1}, {venue.address?.city} {venue.address?.postalCode}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link to={`/games/new?venueId=${venue._id || venue.id}`}>
                <Button variant="primary" size="lg" leftIcon="plus" className="shadow-lg shadow-primary/20">
                  Host Game Here
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Description, Courts, Photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Venue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">About This Facility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {venue.description || 'Welcome to this sports facility featuring high-quality courts and amenities.'}
              </p>

              {/* Amenities List */}
              {venue.amenities && venue.amenities.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Available Amenities & Perks
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {venue.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground capitalize"
                      >
                        <Icon name="check" size={14} className="text-primary" />
                        {amenity.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Courts Directory */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Courts & Pitches</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {courts.length} {courts.length === 1 ? 'Court' : 'Courts'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {courts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Specific court numbers will be designated upon check-in.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courts.map((court, cIdx) => (
                    <div
                      key={court.courtId || cIdx}
                      className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                          <Icon name="activity" size={15} className="text-primary" />
                          {court.name}
                        </h4>
                        <Badge
                          variant={court.isActive !== false ? 'success' : 'outline'}
                          className="text-[10px]"
                        >
                          {court.isActive !== false ? 'Active' : 'Maintenance'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {court.sportKeys?.map((sk, skIdx) => (
                          <span
                            key={skIdx}
                            className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photo Gallery if extra photos exist */}
          {venue.photoUrls && venue.photoUrls.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Photo Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {venue.photoUrls.slice(1).map((photoUrl, pIdx) => (
                    <div key={pIdx} className="h-32 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photoUrl}
                        alt={`${venue.name} preview ${pIdx + 2}`}
                        className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col): Hours, Location Coordinates, Contact */}
        <div className="space-y-6">
          {/* Operating Hours */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Icon name="clock" className="text-primary" size={18} />
                <CardTitle className="text-base">Operating Hours</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              {venue.weeklyHours && venue.weeklyHours.length > 0 ? (
                venue.weeklyHours.map((slot, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0"
                  >
                    <span className="font-medium text-foreground">
                      {DAYS_OF_WEEK[slot.dayOfWeek] || `Day ${slot.dayOfWeek}`}
                    </span>
                    <span className="text-muted-foreground">
                      {formatMinute(slot.openMinute)} — {formatMinute(slot.closeMinute)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic">Standard community operating hours apply.</p>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          {venue.contactInfo && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="info" className="text-primary" size={18} />
                  <CardTitle className="text-base">Contact Facility</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {venue.contactInfo.phone && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon name="info" size={14} className="text-muted-foreground" />
                    <span>{venue.contactInfo.phone}</span>
                  </div>
                )}
                {venue.contactInfo.email && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon name="mail" size={14} className="text-muted-foreground" />
                    <span>{venue.contactInfo.email}</span>
                  </div>
                )}
                {venue.contactInfo.website && (
                  <div className="flex items-center gap-2">
                    <Icon name="info" size={14} className="text-muted-foreground" />
                    <a
                      href={venue.contactInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {venue.contactInfo.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Host CTA Card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5 space-y-3 text-center">
              <Icon name="trophy" size={28} className="mx-auto text-primary" />
              <div>
                <h4 className="font-bold text-foreground text-sm">Want to Play Here?</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Schedule a private or open match with friends at {venue.name}.
                </p>
              </div>
              <Link to={`/games/new?venueId=${venue._id || venue.id}`} className="block">
                <Button variant="primary" size="sm" className="w-full">
                  Create Match At This Venue
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
