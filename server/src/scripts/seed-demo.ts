import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Profile } from '../models/profile.model.js';
import { Sport } from '../models/sport.model.js';
import { SportProfile } from '../models/sport-profile.model.js';
import { Venue } from '../models/venue.model.js';
import { CourtGuard } from '../models/court-guard.model.js';
import { Game } from '../models/game.model.js';
import { GameParticipant } from '../models/game-participant.model.js';
import { GameEvent } from '../models/game-event.model.js';
import { MatchResult } from '../models/match-result.model.js';
import { GameResult } from '../models/game-result.model.js';
import { GameTeamFormation } from '../models/game-team-formation.model.js';
import { Rating } from '../models/rating.model.js';
import { RatingEvent } from '../models/rating-event.model.js';
import { PlayerReliability } from '../models/player-reliability.model.js';
import { GameFeedback } from '../models/game-feedback.model.js';
import { Notification } from '../models/notification.model.js';
import { DecisionLog } from '../models/decision-log.model.js';
import { passwordService } from '../services/password.service.js';
import { seedSportsCatalog } from './seed-sports.js';
import { GameService } from '../services/game.service.js';
import { GameParticipantService } from '../services/game-participant.service.js';
import { ratingEngineService } from '../services/rating-engine.service.js';
import { VenueService } from '../services/venue.service.js';
import { ReliabilityService } from '../services/reliability.service.js';
import { Roles } from '../constants/roles.js';
import { UserStatuses } from '../constants/user-status.js';
import {
  JoinPolicies,
  GameVisibilities,
  GameStatuses,
  CancellationReasonCodes,
  ParticipantStatuses,
} from '../constants/game-constants.js';
import { MatchSourceTypes } from '../constants/match-sources.js';
import { ResultStatuses, RatingStatuses } from '../constants/result-constants.js';
import { TeamSideKeys, TeamBalanceMethods } from '../constants/team-constants.js';
import { AttendanceStatuses } from '../constants/reliability-constants.js';
import { NotificationTypes } from '../constants/notification-constants.js';
import { DecisionTypes, FactorImpacts } from '../constants/explainability-constants.js';
import { transitionGame } from '../services/game-transition.service.js';
import { DemoConstants } from '../constants/demo-constants.js';
import { OnboardingStatuses, OnboardingSteps } from '../constants/onboarding-steps.js';
import { Collections } from '../constants/collections.js';
import { TestClock } from '../utils/clock.js';
import { logger } from '../utils/logger.js';

export class DatabaseSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseSafetyError';
  }
}

/**
 * Asserts that a target MongoDB URI points only to local safe hosts and not production.
 * Must refuse BEFORE any connection attempt!
 */
export function assertSafeLocalDatabase(uri: string, nodeEnv?: string): void {
  if (nodeEnv === 'production') {
    throw new DatabaseSafetyError('SAFETY ERROR: Refusing to seed database when NODE_ENV is "production"!');
  }

  if (!uri || typeof uri !== 'string') {
    throw new DatabaseSafetyError('SAFETY ERROR: Empty or invalid MONGODB_URI provided');
  }

  const trimmed = uri.trim();

  // Always refuse mongodb+srv:// unless remote execution is explicitly allowed via reviewed safety flag
  if (trimmed.startsWith('mongodb+srv://')) {
    throw new DatabaseSafetyError('SAFETY ERROR: Refusing connection with "mongodb+srv://" protocol! Local development only.');
  }

  if (!trimmed.startsWith('mongodb://')) {
    throw new DatabaseSafetyError('SAFETY ERROR: URI must use the standard "mongodb://" protocol.');
  }

  const afterProto = trimmed.slice('mongodb://'.length);
  const withoutAuth = afterProto.includes('@') ? afterProto.split('@')[1]! : afterProto;
  const hostPart = withoutAuth.split('/')[0]!;
  const hosts = hostPart.split(',').map((h) => h.trim().toLowerCase());

  const ALLOWED_LOCAL_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    'mongo',
    'playmatch-mongo',
    'host.docker.internal',
  ]);

  for (const hostWithPort of hosts) {
    let hostName = hostWithPort;
    if (hostName.startsWith('[') && hostName.includes(']')) {
      hostName = hostName.slice(1, hostName.indexOf(']'));
    } else if (hostName.includes(':')) {
      hostName = hostName.split(':')[0]!;
    }

    if (!ALLOWED_LOCAL_HOSTS.has(hostName)) {
      throw new DatabaseSafetyError(
        `SAFETY ERROR: Host "${hostName}" is not on the local safe allowlist! Target must be local only.`,
      );
    }
  }
}

/**
 * Deletes all documents in dependency-aware order (children before parents).
 * Preserves all collection definitions, schema validators, TTL indexes, and 2dsphere indexes.
 */
export async function clearDatabaseDocuments(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection is not active.');
  }

  const dbName = db.databaseName;
  if (
    dbName === 'production' ||
    dbName === 'playmatch_prod' ||
    process.env.NODE_ENV === 'production'
  ) {
    throw new DatabaseSafetyError(
      `SAFETY ERROR: Refusing to clear database "${dbName}" when NODE_ENV is "${process.env.NODE_ENV}"!`,
    );
  }

  logger.warn({ dbName }, 'Clearing database documents in dependency order...');

  const deletionOrder = [
    Collections.DECISION_LOGS,
    Collections.NOTIFICATIONS,
    Collections.RATING_EVENTS,
    Collections.MATCH_RESULTS,
    Collections.RATINGS,
    Collections.PLAYER_RELIABILITY,
    Collections.GAME_FEEDBACK,
    Collections.GAME_RESULTS,
    Collections.GAME_TEAM_FORMATIONS,
    Collections.GAME_EVENTS,
    Collections.GAME_PARTICIPANTS,
    Collections.COURT_GUARDS,
    Collections.GAMES,
    Collections.VENUES,
    Collections.SPORT_PROFILES,
    Collections.PROFILES,
    Collections.REFRESH_SESSIONS,
    Collections.ONE_TIME_TOKENS,
    Collections.USERS,
  ];

  for (const colName of deletionOrder) {
    await db.collection(colName).deleteMany({});
  }

  logger.info({ dbName }, 'All application collections cleared successfully.');
}

export interface SeedDemoOptions {
  reset?: boolean;
  demoPassword?: string;
  mongoUri?: string;
  allowRemoteDb?: boolean;
}

export interface SeedDemoResult {
  adminEmail: string;
  venueOwnerEmail: string;
  venueOwnerEmails: string[];
  playerCount: number;
  playerEmails: string[];
  venueCount: number;
  gameCount: number;
  collectionCounts: Record<string, number>;
}

export async function seedDemoData(options: SeedDemoOptions = {}): Promise<SeedDemoResult> {
  const uri = options.mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/playmatch';
  const nodeEnv = process.env.NODE_ENV;

  const allowRemote =
    options.allowRemoteDb ||
    process.env.ALLOW_REMOTE_DB === 'yes' ||
    process.env.ALLOW_REMOTE_DB === 'true';

  // Safety check before connection (bypassed only when user explicitly approves via allowRemoteDb)
  if (!allowRemote) {
    assertSafeLocalDatabase(uri, nodeEnv);
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // Handle --reset: Dependency-aware document clearance (no collection dropping)
  if (options.reset) {
    await clearDatabaseDocuments();
  }

  // 1. Seed canonical sports catalog (badminton, football, cricket)
  await seedSportsCatalog({ deactivateMissing: true });
  const badmintonSport = await Sport.findOne({ key: 'badminton' });
  const footballSport = await Sport.findOne({ key: 'football' });
  const cricketSport = await Sport.findOne({ key: 'cricket' });

  if (!badmintonSport || !footballSport || !cricketSport) {
    throw new Error('Sports catalog failed to load');
  }

  // 2. Hash password once for all demo users (never store or log plaintext)
  const demoPassword = options.demoPassword || process.env.DEMO_PASSWORD || DemoConstants.FALLBACK_PASSWORD;
  const passwordHash = await passwordService.hash(demoPassword);

  // 3. Seed Administrator
  let admin = await User.findOne({ email: DemoConstants.ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      email: DemoConstants.ADMIN_EMAIL,
      passwordHash,
      name: 'Demo Administrator',
      role: Roles.ADMIN,
      status: UserStatuses.ACTIVE,
      isEmailVerified: true,
    });
  } else {
    admin.passwordHash = passwordHash;
    admin.status = UserStatuses.ACTIVE;
    admin.isEmailVerified = true;
    await admin.save();
  }

  await Profile.findOneAndUpdate(
    { user: admin._id },
    {
      user: admin._id,
      displayName: 'System Admin',
      bio: 'PlayMatch platform administrator and venue verifier.',
      timezone: DemoConstants.CITY.TIMEZONE,
      homeLocation: { type: 'Point', coordinates: [DemoConstants.CITY.LONGITUDE, DemoConstants.CITY.LATITUDE] },
      travelRadiusKm: 25,
      visibility: { profile: 'public', location: 'coarsened', ratings: 'public' },
      onboarding: {
        status: OnboardingStatuses.COMPLETED,
        completedSteps: [
          OnboardingSteps.BASIC_INFO,
          OnboardingSteps.SPORTS,
          OnboardingSteps.AVAILABILITY,
          OnboardingSteps.LOCATION,
          OnboardingSteps.PREFERENCES,
        ],
        completedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  // 4. Seed Venue Owners (owner1 & owner2)
  let owner1 = await User.findOne({ email: DemoConstants.VENUE_OWNER_1_EMAIL });
  if (!owner1) {
    owner1 = await User.create({
      email: DemoConstants.VENUE_OWNER_1_EMAIL,
      passwordHash,
      name: 'Marina Arena Owner',
      role: Roles.VENUE_OWNER,
      status: UserStatuses.ACTIVE,
      isEmailVerified: true,
    });
  } else {
    owner1.passwordHash = passwordHash;
    await owner1.save();
  }

  await Profile.findOneAndUpdate(
    { user: owner1._id },
    {
      user: owner1._id,
      displayName: 'Marina Operations',
      bio: 'Managing premier beachside turf and badminton arenas in Chennai.',
      timezone: DemoConstants.CITY.TIMEZONE,
      homeLocation: { type: 'Point', coordinates: [80.2800, 13.0600] },
      travelRadiusKm: 20,
      visibility: { profile: 'public', location: 'coarsened', ratings: 'public' },
      onboarding: {
        status: OnboardingStatuses.COMPLETED,
        completedSteps: [
          OnboardingSteps.BASIC_INFO,
          OnboardingSteps.SPORTS,
          OnboardingSteps.AVAILABILITY,
          OnboardingSteps.LOCATION,
          OnboardingSteps.PREFERENCES,
        ],
        completedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  let owner2 = await User.findOne({ email: DemoConstants.VENUE_OWNER_2_EMAIL });
  if (!owner2) {
    owner2 = await User.create({
      email: DemoConstants.VENUE_OWNER_2_EMAIL,
      passwordHash,
      name: 'Chepauk Sports Owner',
      role: Roles.VENUE_OWNER,
      status: UserStatuses.ACTIVE,
      isEmailVerified: true,
    });
  } else {
    owner2.passwordHash = passwordHash;
    await owner2.save();
  }

  await Profile.findOneAndUpdate(
    { user: owner2._id },
    {
      user: owner2._id,
      displayName: 'Chepauk Manager',
      bio: 'Box cricket and indoor sports facility coordinator.',
      timezone: DemoConstants.CITY.TIMEZONE,
      homeLocation: { type: 'Point', coordinates: [80.2780, 13.0630] },
      travelRadiusKm: 20,
      visibility: { profile: 'public', location: 'coarsened', ratings: 'public' },
      onboarding: {
        status: OnboardingStatuses.COMPLETED,
        completedSteps: [
          OnboardingSteps.BASIC_INFO,
          OnboardingSteps.SPORTS,
          OnboardingSteps.AVAILABILITY,
          OnboardingSteps.LOCATION,
          OnboardingSteps.PREFERENCES,
        ],
        completedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  // 5. Seed 6 Predictable Player Identities with Distinct Profiles
  interface PlayerSeedConfig {
    email: string;
    name: string;
    displayName: string;
    bio: string;
    coordinates: [number, number];
    sports: Array<{
      sport: any;
      bandKey: string;
      playStyle: string;
      positions: string[];
      gamesPlayed?: number;
      wins?: number;
      losses?: number;
      rating?: number;
      peakRating?: number;
    }>;
  }

  const playerConfigs: PlayerSeedConfig[] = [
    {
      email: `player1@${DemoConstants.DOMAIN}`,
      name: 'Arun Kumar',
      displayName: 'Arun Smash',
      bio: 'Advanced singles & doubles badminton competitor. Fast rallies & aggressive smashes.',
      coordinates: [80.2785, 13.0610],
      sports: [
        { sport: badmintonSport, bandKey: 'advanced', playStyle: 'attacking', positions: [], rating: 1425.5, peakRating: 1450.0, gamesPlayed: 14, wins: 11, losses: 3 },
        { sport: footballSport, bandKey: 'intermediate', playStyle: 'counter_attack', positions: ['forward'], rating: 1250.0, peakRating: 1270.0, gamesPlayed: 5, wins: 3, losses: 2 },
        { sport: cricketSport, bandKey: 'beginner', playStyle: 'box_cricket', positions: ['batter'], rating: 1020.0, peakRating: 1040.0, gamesPlayed: 3, wins: 1, losses: 2 },
      ],
    },
    {
      email: `player2@${DemoConstants.DOMAIN}`,
      name: 'Bhavna Patel',
      displayName: 'Bhavna P',
      bio: 'All-round badminton player and football midfielder. Consistent and active team player.',
      coordinates: [80.2650, 13.0420],
      sports: [
        { sport: badmintonSport, bandKey: 'intermediate', playStyle: 'all_round', positions: [], rating: 1362.0, peakRating: 1380.0, gamesPlayed: 12, wins: 8, losses: 4 },
        { sport: footballSport, bandKey: 'intermediate', playStyle: 'tiki_taka', positions: ['midfielder'], rating: 1210.0, peakRating: 1230.0, gamesPlayed: 4, wins: 2, losses: 2 },
        { sport: cricketSport, bandKey: 'intermediate', playStyle: 'box_cricket', positions: ['all_rounder'], rating: 1240.0, peakRating: 1250.0, gamesPlayed: 5, wins: 3, losses: 2 },
      ],
    },
    {
      email: `player3@${DemoConstants.DOMAIN}`,
      name: 'Chetan Sharma',
      displayName: 'Chetan BoxCricket',
      bio: 'Turf box cricket specialist and recreational badminton enthusiast. Always on time.',
      coordinates: [80.2790, 13.0640],
      sports: [
        { sport: cricketSport, bandKey: 'intermediate', playStyle: 'box_cricket', positions: ['all_rounder'], rating: 1450.0, peakRating: 1480.0, gamesPlayed: 15, wins: 12, losses: 3 },
        { sport: badmintonSport, bandKey: 'beginner', playStyle: 'defensive', positions: [], rating: 1285.4, peakRating: 1300.0, gamesPlayed: 8, wins: 5, losses: 3 },
        { sport: footballSport, bandKey: 'beginner', playStyle: 'casual', positions: ['defender'], rating: 1080.0, peakRating: 1100.0, gamesPlayed: 3, wins: 1, losses: 2 },
      ],
    },
    {
      email: `player4@${DemoConstants.DOMAIN}`,
      name: 'Deepa Sundaram',
      displayName: 'Deepa S',
      bio: 'Competitive badminton doubles player and casual football defender. Enjoys balanced matches.',
      coordinates: [80.2350, 13.0400],
      sports: [
        { sport: badmintonSport, bandKey: 'intermediate', playStyle: 'defensive', positions: [], rating: 1242.0, peakRating: 1260.0, gamesPlayed: 6, wins: 3, losses: 3 },
        { sport: footballSport, bandKey: 'beginner', playStyle: 'casual', positions: ['defender'], rating: 1050.0, peakRating: 1060.0, gamesPlayed: 2, wins: 1, losses: 1 },
        { sport: cricketSport, bandKey: 'intermediate', playStyle: 'box_cricket', positions: ['batter'], rating: 1180.0, peakRating: 1200.0, gamesPlayed: 4, wins: 2, losses: 2 },
      ],
    },
    {
      email: `player5@${DemoConstants.DOMAIN}`,
      name: 'Eashwar Nathan',
      displayName: 'Eashwar N',
      bio: 'Recreational badminton player. Ready to hop in from the waitlist anytime for good matches!',
      coordinates: [80.2520, 13.0330],
      sports: [
        { sport: footballSport, bandKey: 'intermediate', playStyle: 'high_press', positions: ['forward'], rating: 1385.0, peakRating: 1400.0, gamesPlayed: 11, wins: 8, losses: 3 },
        { sport: badmintonSport, bandKey: 'beginner', playStyle: 'all_round', positions: [], rating: 1190.5, peakRating: 1200.0, gamesPlayed: 4, wins: 1, losses: 3 },
        { sport: cricketSport, bandKey: 'beginner', playStyle: 'box_cricket', positions: ['bowler'], rating: 1000.0, peakRating: 1000.0, gamesPlayed: 2, wins: 0, losses: 2 },
      ],
    },
    {
      email: `player6@${DemoConstants.DOMAIN}`,
      name: 'Farhan Khan',
      displayName: 'Farhan K',
      bio: 'Football attacker and box cricket power-hitter. Working on improving match reliability score.',
      coordinates: [80.2150, 13.0850],
      sports: [
        { sport: footballSport, bandKey: 'advanced', playStyle: 'high_press', positions: ['forward'], rating: 1320.0, peakRating: 1340.0, gamesPlayed: 8, wins: 5, losses: 3 },
        { sport: cricketSport, bandKey: 'beginner', playStyle: 'tape_ball', positions: ['batter'], rating: 1080.0, peakRating: 1100.0, gamesPlayed: 3, wins: 1, losses: 2 },
        { sport: badmintonSport, bandKey: 'beginner', playStyle: 'attacking', positions: [], rating: 1148.0, peakRating: 1160.0, gamesPlayed: 3, wins: 1, losses: 2 },
      ],
    },
  ];

  const players: any[] = [];
  const playerEmails: string[] = [];

  for (const pConfig of playerConfigs) {
    let player = await User.findOne({ email: pConfig.email });
    if (!player) {
      player = await User.create({
        email: pConfig.email,
        passwordHash,
        name: pConfig.name,
        role: Roles.PLAYER,
        status: UserStatuses.ACTIVE,
        isEmailVerified: true,
      });
    } else {
      player.passwordHash = passwordHash;
      player.status = UserStatuses.ACTIVE;
      player.isEmailVerified = true;
      await player.save();
    }
    players.push(player);
    playerEmails.push(pConfig.email);

    // Profile
    await Profile.findOneAndUpdate(
      { user: player._id },
      {
        user: player._id,
        displayName: pConfig.displayName,
        bio: pConfig.bio,
        timezone: DemoConstants.CITY.TIMEZONE,
        homeLocation: { type: 'Point', coordinates: pConfig.coordinates },
        travelRadiusKm: 15,
        visibility: { profile: 'public', location: 'coarsened', ratings: 'public' },
        availability: [
          { dayOfWeek: 1, startMinute: 480, endMinute: 1260 },
          { dayOfWeek: 3, startMinute: 480, endMinute: 1260 },
          { dayOfWeek: 5, startMinute: 480, endMinute: 1260 },
          { dayOfWeek: 6, startMinute: 420, endMinute: 1320 },
          { dayOfWeek: 0, startMinute: 420, endMinute: 1320 },
        ],
        onboarding: {
          status: OnboardingStatuses.COMPLETED,
          completedSteps: [
            OnboardingSteps.BASIC_INFO,
            OnboardingSteps.SPORTS,
            OnboardingSteps.AVAILABILITY,
            OnboardingSteps.LOCATION,
            OnboardingSteps.PREFERENCES,
          ],
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    // Sport profiles & initial ratings
    for (const sp of pConfig.sports) {
      const selectedBand =
        sp.sport.skillBands.find((b: any) => b.key === sp.bandKey) || sp.sport.skillBands[0]!;

      await SportProfile.findOneAndUpdate(
        { user: player._id, sport: sp.sport._id },
        {
          user: player._id,
          sport: sp.sport._id,
          selectedBandKey: selectedBand.key,
          playStyle: sp.playStyle,
          preferredPositions: sp.positions,
          isActive: true,
        },
        { upsert: true, new: true },
      );

      const gamesPlayed = sp.gamesPlayed ?? 0;
      const wins = sp.wins ?? 0;
      const losses = sp.losses ?? 0;
      const rating = sp.rating ?? selectedBand.seedRating;
      const peakRating = sp.peakRating ?? Math.max(rating, selectedBand.seedRating);

      await Rating.findOneAndUpdate(
        { user: player._id, sport: sp.sport._id },
        {
          user: player._id,
          sport: sp.sport._id,
          rating,
          peakRating,
          seedRating: selectedBand.seedRating,
          seedBandKey: selectedBand.key,
          gamesPlayed,
          wins,
          losses,
          draws: 0,
          lastRatedAt: gamesPlayed > 0 ? new Date() : null,
        },
        { upsert: true, new: true }
      );
    }
  }

  // 6. Seed Realistic Venues Partitioned Across Owners
  // Venue 1: Marina Smash Arena (Owner 1, Approved)
  let venue1: any = await Venue.findOne({ name: 'Marina Smash Arena' });
  if (!venue1) {
    venue1 = await VenueService.createVenue(
      owner1._id,
      {
        name: 'Marina Smash Arena',
        description: 'Premier multi-sport arena near Marina Beach with synthetic badminton courts and 5s turf.',
        address: { line1: '42 Beach Road', city: DemoConstants.CITY.NAME, state: DemoConstants.CITY.STATE },
        areaLabel: 'Marina Beach',
        location: { type: 'Point', coordinates: [80.2800, 13.0600] },
        timezone: DemoConstants.CITY.TIMEZONE,
        weeklyHours: Array.from({ length: 7 }, (_, day) => ({ dayOfWeek: day, openMinute: 360, closeMinute: 1380 })),
        courts: [
          { name: 'Badminton Court 1', sportKeys: ['badminton'], isActive: true },
          { name: 'Badminton Court 2', sportKeys: ['badminton'], isActive: true },
          { name: 'Football 5s Turf', sportKeys: ['football'], isActive: true },
        ],
      },
      'venue_owner',
    );
    await VenueService.approveVenue(venue1._id, admin._id);
    venue1 = (await Venue.findById(venue1._id))!;
  }

  // Venue 2: Marina Coastal Turf (Owner 1, Approved)
  let venue2: any = await Venue.findOne({ name: 'Marina Coastal Turf' });
  if (!venue2) {
    venue2 = await VenueService.createVenue(
      owner1._id,
      {
        name: 'Marina Coastal Turf',
        description: 'Floodlit artificial grass turf dedicated for 5-a-side and 7-a-side football.',
        address: { line1: '88 Santhome High Road', city: DemoConstants.CITY.NAME, state: DemoConstants.CITY.STATE },
        areaLabel: 'Santhome',
        location: { type: 'Point', coordinates: [80.2830, 13.0550] },
        timezone: DemoConstants.CITY.TIMEZONE,
        weeklyHours: Array.from({ length: 7 }, (_, day) => ({ dayOfWeek: day, openMinute: 360, closeMinute: 1440 })),
        courts: [
          { name: 'Beachside 5s Turf', sportKeys: ['football'], isActive: true },
        ],
      },
      'venue_owner',
    );
    await VenueService.approveVenue(venue2._id, admin._id);
    venue2 = (await Venue.findById(venue2._id))!;
  }

  // Venue 3: Chepauk Turf Grounds (Owner 2, Approved)
  let venue3: any = await Venue.findOne({ name: 'Chepauk Turf Grounds' });
  if (!venue3) {
    venue3 = await VenueService.createVenue(
      owner2._id,
      {
        name: 'Chepauk Turf Grounds',
        description: 'Box cricket and cricket net pitches equipped with high-grade safety netting.',
        address: { line1: '10 Wallajah Road', city: DemoConstants.CITY.NAME, state: DemoConstants.CITY.STATE },
        areaLabel: 'Chepauk',
        location: { type: 'Point', coordinates: [80.2780, 13.0630] },
        timezone: DemoConstants.CITY.TIMEZONE,
        weeklyHours: Array.from({ length: 7 }, (_, day) => ({ dayOfWeek: day, openMinute: 360, closeMinute: 1380 })),
        courts: [
          { name: 'Cricket Net A', sportKeys: ['cricket'], isActive: true },
          { name: 'Box Cricket Arena', sportKeys: ['cricket'], isActive: true },
        ],
      },
      'venue_owner',
    );
    await VenueService.approveVenue(venue3._id, admin._id);
    venue3 = (await Venue.findById(venue3._id))!;
  }

  // Venue 4: Anna Nagar Sports Complex (Owner 2, Pending Approval)
  let venue4: any = await Venue.findOne({ name: 'Anna Nagar Sports Complex' });
  if (!venue4) {
    venue4 = await VenueService.createVenue(
      owner2._id,
      {
        name: 'Anna Nagar Sports Complex',
        description: 'New indoor sports facility awaiting admin verification and licensing approval.',
        address: { line1: '2nd Avenue', city: DemoConstants.CITY.NAME, state: DemoConstants.CITY.STATE },
        areaLabel: 'Anna Nagar',
        location: { type: 'Point', coordinates: [80.2100, 13.0850] },
        timezone: DemoConstants.CITY.TIMEZONE,
        weeklyHours: Array.from({ length: 7 }, (_, day) => ({ dayOfWeek: day, openMinute: 420, closeMinute: 1320 })),
        courts: [
          { name: 'Indoor Court Alpha', sportKeys: ['badminton'], isActive: true },
        ],
      },
      'venue_owner',
    );
    // Remains PENDING_APPROVAL for admin workflow demonstration
  }

  // Concurrency court guards for all venues
  const allVenues = [venue1, venue2, venue3, venue4];
  for (const v of allVenues) {
    for (const c of v.courts) {
      await CourtGuard.findOneAndUpdate(
        { venueId: v._id, courtId: c.courtId },
        { venueId: v._id, courtId: c.courtId, $setOnInsert: { version: 1 } },
        { upsert: true },
      );
    }
  }

  // 7. Seed 10 Comprehensive Game Scenarios
  const now = Date.now();
  const createdGames: any[] = [];

  // Helper to complete a past game using TestClocks
  async function seedCompletedPastGame(
    gameHost: any,
    joinedPlayers: any[],
    startTime: Date,
    endTime: Date,
    gameNotes: string,
    sportKey: string,
    formatKey: string,
    courtInfo?: { venueId: any; courtId: string },
  ) {
    let pastGame: any = await Game.findOne({ notes: gameNotes });
    if (!pastGame) {
      const creationClock = new TestClock(startTime.getTime() - 2 * 3600 * 1000);
      pastGame = await GameService.createGame(
        gameHost._id,
        {
          sportKey,
          formatKey,
          startsAt: startTime,
          endsAt: endTime,
          venueId: courtInfo?.venueId,
          courtId: courtInfo?.courtId,
          location: courtInfo ? undefined : { type: 'Point', coordinates: [80.2600, 13.0600] },
          courtName: courtInfo ? undefined : 'Community Sports Ground',
          joinPolicy: JoinPolicies.OPEN,
          visibility: GameVisibilities.PUBLIC,
          notes: gameNotes,
        },
        creationClock,
      );

      for (const p of joinedPlayers) {
        await GameParticipantService.joinGame(p._id, pastGame._id, creationClock);
      }

      const hostActorId = gameHost._id;
      const startClock = new TestClock(startTime.getTime() + 5 * 60 * 1000);
      await transitionGame(pastGame, {
        toStatus: GameStatuses.CONFIRMED,
        actorId: hostActorId,
        actorRole: 'host',
        reason: 'Roster filled and confirmed',
        clock: creationClock,
      });

      await transitionGame(pastGame, {
        toStatus: GameStatuses.IN_PROGRESS,
        actorId: hostActorId,
        actorRole: 'host',
        reason: 'Match in progress',
        clock: startClock,
      });

      const endClock = new TestClock(endTime.getTime());
      await transitionGame(pastGame, {
        toStatus: GameStatuses.COMPLETED,
        actorId: hostActorId,
        actorRole: 'host',
        reason: 'Match completed cleanly',
        clock: endClock,
      });
    }
    return pastGame;
  }

  // Game 1: OPEN Singles Badminton (Tomorrow, 1 slot available)
  const g1Start = new Date(now + 24 * 3600 * 1000);
  const g1End = new Date(g1Start.getTime() + 60 * 60 * 1000);
  let g1: any = await Game.findOne({ notes: 'Demo Open Singles Badminton' });
  if (!g1) {
    g1 = await GameService.createGame(players[0]!._id, {
      sportKey: 'badminton',
      formatKey: 'singles',
      startsAt: g1Start,
      endsAt: g1End,
      venueId: venue1._id,
      courtId: venue1.courts[0]?.courtId,
      joinPolicy: JoinPolicies.OPEN,
      visibility: GameVisibilities.PUBLIC,
      notes: 'Demo Open Singles Badminton',
    });
  }
  createdGames.push(g1);

  // Game 2: NEARLY FULL Doubles Badminton (3/4 filled)
  const g2Start = new Date(now + 30 * 3600 * 1000);
  const g2End = new Date(g2Start.getTime() + 60 * 60 * 1000);
  let g2: any = await Game.findOne({ notes: 'Demo Nearly Full Doubles Badminton' });
  if (!g2) {
    const rawG2 = await GameService.createGame(players[1]!._id, {
      sportKey: 'badminton',
      formatKey: 'doubles',
      startsAt: g2Start,
      endsAt: g2End,
      venueId: venue1._id,
      courtId: venue1.courts[1]?.courtId,
      joinPolicy: JoinPolicies.OPEN,
      visibility: GameVisibilities.PUBLIC,
      notes: 'Demo Nearly Full Doubles Badminton',
    });
    const g2Id = (rawG2 as any)._id || (rawG2 as any).id;
    g2 = (await Game.findById(g2Id))!;
    await GameParticipantService.joinGame(players[2]!._id, g2._id);
    await GameParticipantService.joinGame(players[3]!._id, g2._id);
    g2 = (await Game.findById(g2._id))!;
  }
  createdGames.push(g2);

  // Game 3: FULL Doubles Badminton with Waitlist
  const g3Start = new Date(now + 48 * 3600 * 1000);
  const g3End = new Date(g3Start.getTime() + 60 * 60 * 1000);
  let g3: any = await Game.findOne({ notes: 'Demo Full Doubles with Waitlist' });
  if (!g3) {
    const rawG3 = await GameService.createGame(players[0]!._id, {
      sportKey: 'badminton',
      formatKey: 'doubles',
      startsAt: g3Start,
      endsAt: g3End,
      venueId: venue1._id,
      courtId: venue1.courts[0]?.courtId,
      joinPolicy: JoinPolicies.OPEN,
      visibility: GameVisibilities.PUBLIC,
      notes: 'Demo Full Doubles with Waitlist',
    });
    const g3Id = (rawG3 as any)._id || (rawG3 as any).id;
    g3 = (await Game.findById(g3Id))!;
    await GameParticipantService.joinGame(players[1]!._id, g3._id);
    await GameParticipantService.joinGame(players[2]!._id, g3._id);
    await GameParticipantService.joinGame(players[3]!._id, g3._id);
    // Player 5 joins after capacity -> Waitlist
    await GameParticipantService.joinGame(players[4]!._id, g3._id);
    g3 = (await Game.findById(g3._id))!;
  }
  createdGames.push(g3);

  // Game 4: APPROVAL REQUIRED Box Cricket (Requested player awaiting action)
  const g4Start = new Date(now + 36 * 3600 * 1000);
  const g4End = new Date(g4Start.getTime() + 60 * 60 * 1000);
  let g4: any = await Game.findOne({ notes: 'Demo Approval Required Box Cricket' });
  if (!g4) {
    const rawG4 = await GameService.createGame(players[2]!._id, {
      sportKey: 'cricket',
      formatKey: '6_a_side',
      startsAt: g4Start,
      endsAt: g4End,
      venueId: venue3._id,
      courtId: venue3.courts[1]?.courtId,
      joinPolicy: JoinPolicies.APPROVAL,
      visibility: GameVisibilities.PUBLIC,
      notes: 'Demo Approval Required Box Cricket',
    });
    const g4Id = (rawG4 as any)._id || (rawG4 as any).id;
    g4 = (await Game.findById(g4Id))!;
    // Player 4 requests to join
    await GameParticipantService.joinGame(players[3]!._id, g4._id);
    g4 = (await Game.findById(g4._id))!;
  }
  createdGames.push(g4);

  // Game 5: CONFIRMED Match with Automated Team Formation
  const g5Start = new Date(now + 12 * 3600 * 1000);
  const g5End = new Date(g5Start.getTime() + 60 * 60 * 1000);
  let g5: any = await Game.findOne({ notes: 'Demo Confirmed Match with Teams' });
  if (!g5) {
    const rawG5 = await GameService.createGame(players[1]!._id, {
      sportKey: 'football',
      formatKey: '5_a_side',
      startsAt: g5Start,
      endsAt: g5End,
      venueId: venue2._id,
      courtId: venue2.courts[0]?.courtId,
      joinPolicy: JoinPolicies.OPEN,
      visibility: GameVisibilities.PUBLIC,
      notes: 'Demo Confirmed Match with Teams',
    });
    const g5Id = (rawG5 as any)._id || (rawG5 as any).id;
    g5 = (await Game.findById(g5Id))!;
    await GameParticipantService.joinGame(players[0]!._id, g5._id);
    await GameParticipantService.joinGame(players[3]!._id, g5._id);
    await GameParticipantService.joinGame(players[5]!._id, g5._id);

    await transitionGame(g5, {
      toStatus: GameStatuses.CONFIRMED,
      actorId: players[1]!._id,
      actorRole: 'host',
      reason: 'Host confirmed roster for upcoming match',
    });
    g5 = (await Game.findById(g5._id))!;

    // Generate balanced teams formation
    await GameTeamFormation.findOneAndUpdate(
      { gameId: g5._id },
      {
        gameId: g5._id,
        teams: [
          {
            sideKey: TeamSideKeys.TEAM_A,
            name: 'Team Alpha',
            players: [
              { userId: players[0]!._id.toString(), displayName: 'Arun Smash', rating: 1400, position: 'forward' },
              { userId: players[3]!._id.toString(), displayName: 'Deepa S', rating: 1000, position: 'defender' },
            ],
            ratingTotal: 2400,
            ratingAverage: 1200,
          },
          {
            sideKey: TeamSideKeys.TEAM_B,
            name: 'Team Bravo',
            players: [
              { userId: players[1]!._id.toString(), displayName: 'Bhavna P', rating: 1200, position: 'midfielder' },
              { userId: players[5]!._id.toString(), displayName: 'Farhan K', rating: 1200, position: 'forward' },
            ],
            ratingTotal: 2400,
            ratingAverage: 1200,
          },
        ],
        balance: {
          difference: 0,
          method: TeamBalanceMethods.SNAKE_DRAFT_ELO,
        },
        reasons: ['Optimal rating balance across both sides', 'Balanced defensive and attacking positions'],
        generatedAt: new Date(),
        generatedBy: players[1]!._id,
      },
      { upsert: true },
    );
  }
  createdGames.push(g5);

  // Game 6: COMPLETED Badminton Match (3 Days Ago) with Verified Result & Rating Ledger
  const g6Start = new Date(now - 72 * 3600 * 1000);
  const g6End = new Date(g6Start.getTime() + 60 * 60 * 1000);
  const g6 = await seedCompletedPastGame(
    players[0]!,
    [players[1]!, players[2]!, players[3]!],
    g6Start,
    g6End,
    'Demo Completed Verified Match 1',
    'badminton',
    'doubles',
    { venueId: venue1._id, courtId: venue1.courts[0]?.courtId },
  );
  createdGames.push(g6);

  // Tied Match Result & Rating Ledger
  const existingMatch1 = await MatchResult.findOne({ 'source.id': g6._id.toString() });
  if (!existingMatch1) {
    await ratingEngineService.applyMatchResult(
      {
        sportKey: 'badminton',
        source: {
          type: MatchSourceTypes.GAME,
          id: g6._id.toString(),
        },
        sides: [
          {
            sideKey: 'side_a',
            playerIds: [players[0]!._id.toString(), players[1]!._id.toString()],
            score: 2,
          },
          {
            sideKey: 'side_b',
            playerIds: [players[2]!._id.toString(), players[3]!._id.toString()],
            score: 1,
          },
        ],
      },
      admin._id.toString(),
    );

    // Module 5 Game Result (Verified)
    await GameResult.findOneAndUpdate(
      { gameId: g6._id },
      {
        gameId: g6._id,
        status: ResultStatuses.VERIFIED,
        ratingStatus: RatingStatuses.APPLIED,
        proposal: {
          proposedByUserId: players[0]!._id,
          proposedAt: new Date(g6End.getTime() + 10 * 60 * 1000),
          scores: [
            { sideKey: 'side_a', score: 2, winner: true },
            { sideKey: 'side_b', score: 1, winner: false },
          ],
          notes: 'Great intense 3-set badminton match.',
        },
        whoMustActNext: [],
        verifiedAt: new Date(g6End.getTime() + 30 * 60 * 1000),
      },
      { upsert: true },
    );

    // Seed Attendance Feedback for Game 6
    await GameFeedback.findOneAndUpdate(
      { gameId: g6._id, targetUserId: players[1]!._id },
      {
        gameId: g6._id,
        reporterUserId: players[0]!._id,
        targetUserId: players[1]!._id,
        attendance: AttendanceStatuses.ATTENDED,
        note: 'Punctual and energetic gameplay.',
      },
      { upsert: true },
    );
    await GameFeedback.findOneAndUpdate(
      { gameId: g6._id, targetUserId: players[2]!._id },
      {
        gameId: g6._id,
        reporterUserId: players[0]!._id,
        targetUserId: players[2]!._id,
        attendance: AttendanceStatuses.ATTENDED,
        note: 'Great defense on the court.',
      },
      { upsert: true },
    );
    await GameFeedback.findOneAndUpdate(
      { gameId: g6._id, targetUserId: players[3]!._id },
      {
        gameId: g6._id,
        reporterUserId: players[0]!._id,
        targetUserId: players[3]!._id,
        attendance: AttendanceStatuses.ATTENDED,
      },
      { upsert: true },
    );
  }

  // Game 7: COMPLETED Football Match (1 Day Ago) with Disputed Result
  const g7Start = new Date(now - 24 * 3600 * 1000);
  const g7End = new Date(g7Start.getTime() + 60 * 60 * 1000);
  const g7 = await seedCompletedPastGame(
    players[3]!,
    [players[0]!, players[1]!, players[5]!],
    g7Start,
    g7End,
    'Demo Completed Disputed Match 2',
    'football',
    '5_a_side',
    { venueId: venue2._id, courtId: venue2.courts[0]?.courtId },
  );
  createdGames.push(g7);

  // Module 5 Disputed Game Result
  await GameResult.findOneAndUpdate(
    { gameId: g7._id },
    {
      gameId: g7._id,
      status: ResultStatuses.DISPUTED,
      ratingStatus: RatingStatuses.NOT_PROCESSED,
      proposal: {
        proposedByUserId: players[3]!._id,
        proposedAt: new Date(g7End.getTime() + 15 * 60 * 1000),
        scores: [
          { sideKey: 'team_alpha', score: 3, winner: true },
          { sideKey: 'team_beta', score: 2, winner: false },
        ],
        notes: 'Final goal scored in extra time.',
      },
      whoMustActNext: [players[5]!._id],
      disputedAt: new Date(g7End.getTime() + 45 * 60 * 1000),
      disputedByUserId: players[5]!._id,
    },
    { upsert: true },
  );

  // Attendance Feedback: Player 6 arrived late
  await GameFeedback.findOneAndUpdate(
    { gameId: g7._id, targetUserId: players[5]!._id },
    {
      gameId: g7._id,
      reporterUserId: players[3]!._id,
      targetUserId: players[5]!._id,
      attendance: AttendanceStatuses.LATE,
      note: 'Arrived 20 minutes after kickoff.',
    },
    { upsert: true },
  );
  await GameFeedback.findOneAndUpdate(
    { gameId: g7._id, targetUserId: players[0]!._id },
    {
      gameId: g7._id,
      reporterUserId: players[3]!._id,
      targetUserId: players[0]!._id,
      attendance: AttendanceStatuses.ATTENDED,
    },
    { upsert: true },
  );

  // Game 8: COMPLETED Cricket Match (2 Days Ago) with No-Show Feedback
  const g8Start = new Date(now - 48 * 3600 * 1000);
  const g8End = new Date(g8Start.getTime() + 60 * 60 * 1000);
  const g8 = await seedCompletedPastGame(
    players[2]!,
    [players[0]!, players[1]!, players[5]!],
    g8Start,
    g8End,
    'Demo Completed Cricket Match 3',
    'cricket',
    '6_a_side',
    { venueId: venue3._id, courtId: venue3.courts[1]?.courtId },
  );
  createdGames.push(g8);

  // Feedback: Player 6 recorded as No-Show by Host
  await GameFeedback.findOneAndUpdate(
    { gameId: g8._id, targetUserId: players[5]!._id },
    {
      gameId: g8._id,
      reporterUserId: players[2]!._id,
      targetUserId: players[5]!._id,
      attendance: AttendanceStatuses.NO_SHOW,
      note: 'Failed to attend without notice.',
    },
    { upsert: true },
  );
  await GameFeedback.findOneAndUpdate(
    { gameId: g8._id, targetUserId: players[0]!._id },
    {
      gameId: g8._id,
      reporterUserId: players[2]!._id,
      targetUserId: players[0]!._id,
      attendance: AttendanceStatuses.ATTENDED,
    },
    { upsert: true },
  );

  // Recompute Player Reliability for all players via actual domain service
  for (const p of players) {
    await ReliabilityService.recomputeForUser(p._id);
  }

  // Game 9: CANCELLED Game (Weather cancellation audit)
  const g9Start = new Date(now + 72 * 3600 * 1000);
  const g9End = new Date(g9Start.getTime() + 60 * 60 * 1000);
  let g9: any = await Game.findOne({ notes: 'Demo Cancelled Game' });
  if (!g9) {
    const rawG9 = await GameService.createGame(players[3]!._id, {
      sportKey: 'football',
      formatKey: '5_a_side',
      startsAt: g9Start,
      endsAt: g9End,
      venueId: venue2._id,
      courtId: venue2.courts[0]?.courtId,
      joinPolicy: JoinPolicies.OPEN,
      visibility: GameVisibilities.PUBLIC,
      notes: 'Demo Cancelled Game',
    });
    const g9Id = (rawG9 as any)._id || (rawG9 as any).id;
    g9 = (await Game.findById(g9Id))!;
    await GameService.cancelGame(g9._id, players[3]!._id, {
      reasonCode: CancellationReasonCodes.WEATHER,
      reasonText: 'Heavy monsoon storm alert issued by municipal corporation',
    });
    g9 = (await Game.findById(g9._id))!;
  }
  createdGames.push(g9);

  // Game 10: UNLISTED Game with Invite Code
  const g10Start = new Date(now + 60 * 3600 * 1000);
  const g10End = new Date(g10Start.getTime() + 60 * 60 * 1000);
  let g10: any = await Game.findOne({ notes: 'Demo Private Game with Invite Code' });
  if (!g10) {
    g10 = await GameService.createGame(players[0]!._id, {
      sportKey: 'badminton',
      formatKey: 'singles',
      startsAt: g10Start,
      endsAt: g10End,
      venueId: venue1._id,
      courtId: venue1.courts[1]?.courtId,
      joinPolicy: JoinPolicies.OPEN,
      visibility: GameVisibilities.UNLISTED,
      inviteCode: 'PLAY26',
      notes: 'Demo Private Game with Invite Code',
    });
  }
  createdGames.push(g10);

  // 8. Seed Realistic In-App Notifications
  const notificationsToSeed = [
    {
      user: players[0]!._id,
      type: NotificationTypes.GAME_CONFIRMED,
      title: 'Game Confirmed!',
      message: 'Your upcoming football game has been confirmed with balanced rosters.',
      read: false,
      data: { gameId: g5._id.toString() },
    },
    {
      user: players[0]!._id,
      type: NotificationTypes.RESULT_VERIFIED,
      title: 'Result Verified',
      message: 'Your badminton doubles victory was confirmed and ratings updated.',
      read: true,
      data: { gameId: g6._id.toString() },
    },
    {
      user: players[3]!._id,
      type: NotificationTypes.GAME_INVITATION,
      title: 'Join Request Received',
      message: 'Deepa S has requested to join your box cricket match.',
      read: false,
      data: { gameId: g4._id.toString() },
    },
    {
      user: players[4]!._id,
      type: NotificationTypes.GAME_JOINED,
      title: 'Waitlist Update',
      message: 'You are currently #1 on the waitlist for doubles badminton at Marina Smash Arena.',
      read: false,
      data: { gameId: g3._id.toString() },
    },
    {
      user: players[5]!._id,
      type: NotificationTypes.RESULT_DISPUTED,
      title: 'Match Dispute Opened',
      message: 'You disputed the reported score for Football 5s. Waiting for organizer review.',
      read: false,
      data: { gameId: g7._id.toString() },
    },
    {
      user: owner2._id,
      type: NotificationTypes.SYSTEM,
      title: 'Venue Review Pending',
      message: 'Anna Nagar Sports Complex has been submitted and is awaiting administrator verification.',
      read: false,
      data: { venueId: venue4._id.toString() },
    },
    {
      user: admin._id,
      type: NotificationTypes.SYSTEM,
      title: 'New Venue Pending Approval',
      message: 'Chepauk Sports Owner submitted Anna Nagar Sports Complex for verification.',
      read: false,
      data: { venueId: venue4._id.toString() },
    },
  ];

  for (const n of notificationsToSeed) {
    await Notification.findOneAndUpdate(
      { user: n.user, title: n.title },
      { ...n, createdAt: new Date() },
      { upsert: true },
    );
  }

  // 9. Seed Explainability Decision Logs
  const decisionLogsToSeed = [
    {
      decisionType: DecisionTypes.RECOMMENDATION,
      subjectId: g1._id.toString(),
      actorId: players[0]!._id,
      inputSnapshot: { sport: 'badminton', travelRadiusKm: 15, skillBand: 'advanced' },
      outputDecision: { recommended: true, score: 0.94 },
      factors: [
        { name: 'Sport Interest Match', value: 1.0, impact: FactorImpacts.POSITIVE },
        { name: 'Geographic Proximity (1.2 km)', value: 0.95, impact: FactorImpacts.POSITIVE },
        { name: 'Skill Rating Balance', value: 0.9, impact: FactorImpacts.POSITIVE },
      ],
      metrics: { distanceKm: 1.2, ratingDifference: 20 },
      codes: ['SPORT_PREF_MATCH', 'PROXIMITY_OPTIMAL', 'SKILL_TIER_COMPATIBLE'],
      summary: 'Recommended due to exact badminton sport preference, 1.2km proximity, and balanced skill rating.',
      reasons: [
        'Player preferred sport aligns with badminton format',
        'Venue is within 1.2 km of home location',
      ],
    },
    {
      decisionType: DecisionTypes.TEAM_BALANCING,
      subjectId: g5._id.toString(),
      actorId: players[1]!._id,
      inputSnapshot: { sport: 'football', playerCount: 4 },
      outputDecision: { method: TeamBalanceMethods.SNAKE_DRAFT_ELO, difference: 0 },
      factors: [
        { name: 'ELO Balance Disparity', value: 0, impact: FactorImpacts.POSITIVE },
        { name: 'Field Position Compatibility', value: 1.0, impact: FactorImpacts.POSITIVE },
      ],
      metrics: { teamARatingAvg: 1200, teamBRatingAvg: 1200 },
      codes: ['RATING_EQUILIBRIUM', 'POSITION_COMPATIBILITY'],
      summary: 'Automated snake draft created teams with identical average ratings (1200) and balanced field positions.',
      reasons: ['Equal average team rating of 1200 points', 'Both teams have allocated forward/defender positions'],
    },
    {
      decisionType: DecisionTypes.RELIABILITY_SCORE,
      subjectId: players[5]!._id.toString(),
      actorId: players[5]!._id,
      inputSnapshot: { gamesAttended: 1, gamesLate: 1, gamesNoShow: 1 },
      outputDecision: { score: 62, tier: 'medium' },
      factors: [
        { name: 'On-time Attendance', value: 1.0, impact: FactorImpacts.POSITIVE },
        { name: 'Late Arrival Penalty', value: -0.2, impact: FactorImpacts.NEGATIVE },
        { name: 'Unexcused No-Show Penalty', value: -0.5, impact: FactorImpacts.NEGATIVE },
      ],
      metrics: { attendedGames: 1, lateLeaves: 1, noShows: 1 },
      codes: ['ATTENDANCE_COMPUTED'],
      summary: 'Player reliability score updated from peer attendance reports reflecting 1 late arrival and 1 no-show.',
      reasons: ['Peer feedback confirmed 1 late arrival and 1 no-show'],
    },
  ];

  for (const dl of decisionLogsToSeed) {
    await DecisionLog.findOneAndUpdate(
      { decisionType: dl.decisionType, subjectId: dl.subjectId, actorId: dl.actorId },
      dl,
      { upsert: true },
    );
  }

  // 10. Compute exact document counts across all collections for verification
  const db = mongoose.connection.db!;
  const collectionCounts: Record<string, number> = {};
  const allCollectionNames = Object.values(Collections);
  for (const col of allCollectionNames) {
    collectionCounts[col] = await db.collection(col).countDocuments();
  }

  logger.info(
    {
      adminEmail: DemoConstants.ADMIN_EMAIL,
      ownerCount: 2,
      playerCount: players.length,
      venueCount: allVenues.length,
      gameCount: createdGames.length,
    },
    'Clean, deterministic PlayMatch demo dataset seeded successfully!',
  );

  return {
    adminEmail: DemoConstants.ADMIN_EMAIL,
    venueOwnerEmail: DemoConstants.VENUE_OWNER_1_EMAIL,
    venueOwnerEmails: [DemoConstants.VENUE_OWNER_1_EMAIL, DemoConstants.VENUE_OWNER_2_EMAIL],
    playerCount: players.length,
    playerEmails,
    venueCount: allVenues.length,
    gameCount: createdGames.length,
    collectionCounts,
  };
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const isReset = process.argv.includes('--reset');
  const allowRemote =
    process.argv.includes('--allow-remote') ||
    process.env.ALLOW_REMOTE_DB === 'true' ||
    process.env.ALLOW_REMOTE_DB === 'yes';
  seedDemoData({ reset: isReset, allowRemoteDb: allowRemote })
    .then((result) => {
      console.log('========================================================');
      console.log('✅ PLAYMATCH DEMO DATASET SEEDED SUCCESSFULLY');
      console.log('========================================================');
      console.log(`Admin User:         ${result.adminEmail}`);
      console.log(`Venue Owners:       ${result.venueOwnerEmails.join(', ')}`);
      console.log(`Demo Players:       ${result.playerEmails.join(', ')}`);
      console.log(`Venues Created:     ${result.venueCount}`);
      console.log(`Games Seeded:       ${result.gameCount}`);
      console.log('Collection Document Counts:');
      for (const [col, count] of Object.entries(result.collectionCounts)) {
        console.log(`  - ${col}: ${count}`);
      }
      console.log('========================================================');
      console.log('Credentials configured securely via DEMO_PASSWORD');
      console.log('Consult server/docs/DEMO_ACCOUNTS.md for full scenario guide.');
      console.log('========================================================');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ SEEDING FAILED:', err.stack || err.message);
      process.exit(1);
    });
}
