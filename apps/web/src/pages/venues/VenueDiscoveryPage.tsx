import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  usePublicVenues,
  useSportsCatalog,
  type PublicVenueItem,
  type DiscoveredVenueItem,
} from '@playmatch/shared';
import { useAuth } from '../../auth/AuthContext';
import { PageLayout } from '../../components/patterns';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

const AMENITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Amenities' },
  { value: 'parking', label: 'Parking Available' },
  { value: 'floodlights', label: 'Floodlights / Night Play' },
  { value: 'lockers', label: 'Lockers / Showers' },
  { value: 'water', label: 'Drinking Water' },
  { value: 'equipment', label: 'Equipment Rental' },
  { value: 'canteen', label: 'Café / Canteen' },
];

const RADIUS_OPTIONS = [
  { value: '10', label: 'Within 10 km' },
  { value: '25', label: 'Within 25 km' },
  { value: '50', label: 'Within 50 km' },
  { value: '100', label: 'Within 100 km' },
];

function formatMinute(minute?: number): string {
  if (minute === undefined || minute === null) return '09:00 AM';
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : m;
  return `${displayH}:${displayM} ${ampm}`;
}

export function VenueDiscoveryPage(): React.ReactElement {
  const { client, user } = useAuth();

  // Coordinates from user profile or fallback to Chennai default
  const userCoords = user?.homeLocation?.coordinates || [80.28, 13.06];

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedAmenity, setSelectedAmenity] = useState<string>('all');
  const [selectedRadius, setSelectedRadius] = useState<string>('25');

  // Sports Catalog
  const { data: sportsData } = useSportsCatalog(client);
  const sportsList: any[] = (sportsData as any)?.sports || (sportsData as any)?.data?.sports || [];

  // Query Public Venues Hook
  const {
    data: venuesData,
    isLoading,
    isError,
    error,
    refetch,
  } = usePublicVenues(
    client,
    {
      lat: userCoords[1],
      lng: userCoords[0],
      radiusKm: Number(selectedRadius) || 25,
      sportKey: selectedSport !== 'all' ? selectedSport : undefined,
      amenity: selectedAmenity !== 'all' ? selectedAmenity : undefined,
      limit: 30,
    },
    {
      staleTime: 60000,
    },
  );

  // Normalize returned venues whether items are { venue, distanceKm } or raw venue objects
  const discoveredItems = useMemo((): Array<{ venue: any; distanceKm?: number }> => {
    const rawItems: any[] =
      (venuesData as any)?.items ||
      (venuesData as any)?.data?.items ||
      (venuesData as any)?.venues ||
      (venuesData as any)?.data?.venues ||
      (Array.isArray(venuesData) ? venuesData : []);

    return rawItems
      .map((item) => {
        if (!item) return null;
        if (item.venue) {
          return {
            venue: item.venue,
            distanceKm: item.distanceKm,
          };
        }
        return {
          venue: item,
          distanceKm: item.distanceKm,
        };
      })
      .filter(Boolean) as Array<{ venue: any; distanceKm?: number }>;
  }, [venuesData]);

  // Client-side text search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return discoveredItems;
    const q = searchQuery.toLowerCase().trim();
    return discoveredItems.filter((item) => {
      const v = item.venue;
      if (!v) return false;
      return (
        v.name?.toLowerCase().includes(q) ||
        v.areaLabel?.toLowerCase().includes(q) ||
        v.address?.city?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
      );
    });
  }, [discoveredItems, searchQuery]);

  return (
    <PageLayout maxWidth="xl">
      <PageHeader
        title="Discover Venues & Courts"
        description="Explore verified sports facilities, arenas, courts, and floodlit turfs in your community."
        actions={
          <div className="flex items-center gap-3">
            <Link to="/games/new">
              <Button variant="primary" size="sm" leftIcon="plus">
                Host Game Here
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="border-border/80">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Search Venue or Area
              </label>
              <div className="relative">
                <Input
                  placeholder="e.g. Marina Arena, Turf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                <Icon
                  name="search"
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>

            {/* Sport Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Sport
              </label>
              <Select
                value={selectedSport}
                onValueChange={setSelectedSport}
                options={[
                  { value: 'all', label: 'All Sports' },
                  ...sportsList.map((s) => ({ value: s.key, label: s.name })),
                ]}
              />
            </div>

            {/* Amenity Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Amenity
              </label>
              <Select
                value={selectedAmenity}
                onValueChange={setSelectedAmenity}
                options={AMENITY_FILTER_OPTIONS}
              />
            </div>

            {/* Radius Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Distance Radius
              </label>
              <Select
                value={selectedRadius}
                onValueChange={setSelectedRadius}
                options={RADIUS_OPTIONS}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to Load Venues"
          message={(error as any)?.message || 'Unable to retrieve venue directory at this time.'}
          onRetry={() => refetch()}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="map-pin"
          title="No Venues Found"
          description={
            searchQuery || selectedSport || selectedAmenity
              ? 'Try widening your search filters or adjusting your distance radius.'
              : 'There are no active partner venues listed within this radius yet.'
          }
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedSport('all');
            setSelectedAmenity('all');
            setSelectedRadius('25');
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{filteredItems.length}</strong> verified venues
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="map-pin" size={13} className="text-primary" />
              Sorted by proximity to your profile area
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(({ venue, distanceKm }) => {
              const venueId = venue._id || venue.id;
              const hasPhotos = venue.photoUrls && venue.photoUrls.length > 0;
              const defaultPhoto =
                'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80';
              const photo = hasPhotos ? venue.photoUrls![0] : defaultPhoto;
              const courtsCount = venue.courts?.length || 0;

              return (
                <Card
                  key={venueId}
                  className="group flex flex-col overflow-hidden border-border/80 transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                >
                  {/* Venue Photo & Distance Badge */}
                  <div className="relative h-48 w-full overflow-hidden bg-muted">
                    <img
                      src={photo}
                      alt={venue.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Proximity Pill */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white">
                        <Icon name="map-pin" size={12} className="text-primary" />
                        {distanceKm !== undefined ? `${distanceKm.toFixed(1)} km` : 'Nearby'}
                      </span>
                    </div>

                    {/* Venue Area Tag & Name on Photo */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                        {venue.areaLabel || venue.address?.city}
                      </span>
                      <h3 className="text-lg font-bold truncate leading-tight mt-0.5">
                        {venue.name}
                      </h3>
                    </div>
                  </div>

                  {/* Details Content */}
                  <CardContent className="flex-1 p-5 space-y-4">
                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {venue.description || 'Modern sports arena equipped with professional courts and lighting.'}
                    </p>

                    {/* Location Address */}
                    <div className="flex items-start gap-2 text-xs text-foreground/80">
                      <Icon name="map-pin" size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                      <span className="line-clamp-1">
                        {venue.address?.line1}, {venue.address?.city}
                      </span>
                    </div>

                    {/* Supported Courts & Sports */}
                    <div className="space-y-1.5 pt-1 border-t border-border/60">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Icon name="activity" size={12} />
                          {courtsCount} {courtsCount === 1 ? 'Court' : 'Courts'} Available
                        </span>
                        <span>{venue.timezone || 'Asia/Kolkata'}</span>
                      </div>

                      {/* Amenities Chips */}
                      {venue.amenities && venue.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {venue.amenities.slice(0, 4).map((amenity: string, aIdx: number) => (
                            <span
                              key={aIdx}
                              className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize"
                            >
                              {amenity.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {venue.amenities.length > 4 && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              +{venue.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Open Hours Preview */}
                    {venue.weeklyHours && venue.weeklyHours.length > 0 && (
                      <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Icon name="clock" size={12} className="text-primary" />
                          Hours:
                        </span>
                        <span>
                          {formatMinute(venue.weeklyHours[0].openMinute)} —{' '}
                          {formatMinute(venue.weeklyHours[0].closeMinute)}
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <Link to={`/venues/${venueId}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Link to={`/games/new?venueId=${venueId}`} className="flex-1">
                        <Button variant="primary" size="sm" className="w-full" leftIcon="plus">
                          Book / Host
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
