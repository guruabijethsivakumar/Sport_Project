import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { app } from '../src/app.js';
import { HttpStatus } from '../src/constants/http-status.js';
import {
  GameStatuses,
  JoinPolicies,
  GameVisibilities,
  ParticipantStatuses,
} from '../src/constants/game-constants.js';
import { tokenService } from '../src/services/token.service.js';
import { createTestUser } from './fixtures/user.fixture.js';
import { createTestSport } from './fixtures/sport.fixture.js';
import { Profile } from '../src/models/profile.model.js';
import { SportProfile } from '../src/models/sport-profile.model.js';
import { Rating } from '../src/models/rating.model.js';
import { Game } from '../src/models/game.model.js';
import { GameParticipant } from '../src/models/game-participant.model.js';
import { GameTeamFormation } from '../src/models/game-team-formation.model.js';
import { RatingEvent } from '../src/models/rating-event.model.js';
import { DecisionLog } from '../src/models/decision-log.model.js';
import { OnboardingStatuses } from '../src/constants/onboarding-steps.js';
import { DecisionTypes } from '../src/constants/explainability-constants.js';

describe('Module 9: Explainability Layer API Endpoints', () => {
  let sportId: Types.ObjectId;
  let sportKey: string;

  beforeEach(async () => {
    const sport = await createTestSport({ key: 'badminton', name: 'Badminton' });
    sportId = sport._id;
    sportKey = sport.key;
  });

  async function createPlayerWithProfile(opts: {
    displayName: string;
    coords?: [number, number];
    travelRadiusKm?: number;
    rating?: number;
  }) {
    const { user } = await createTestUser();
    const token = tokenService.generateAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    await Profile.create({
      user: user.id,
      displayName: opts.displayName,
      bio: 'Player bio',
      homeLocation: {
        type: 'Point',
        coordinates: opts.coords || [77.5946, 12.9716],
      },
      travelRadiusKm: opts.travelRadiusKm || 15,
      availability: [{ dayOfWeek: 5, startMinute: 1080, endMinute: 1200 }],
      visibility: { profile: 'public', location: 'coarsened', ratings: 'public' },
      onboarding: {
        status: OnboardingStatuses.COMPLETED,
        completedSteps: ['basic', 'sports', 'availability', 'location', 'preferences'],
        completedAt: new Date(),
      },
    });

    await SportProfile.create({
      user: user.id,
      sport: sportId,
      selectedBandKey: 'intermediate',
      preferredPositions: ['singles'],
      isActive: true,
    });

    await Rating.create({
      user: user.id,
      sport: sportId,
      rating: opts.rating ?? 1250,
      seedRating: opts.rating ?? 1250,
      seedBandKey: 'intermediate',
      gamesPlayed: 15,
      peakRating: opts.rating ?? 1250,
      wins: 8,
      losses: 7,
      draws: 0,
      lastRatedAt: new Date(),
      history: [],
    });

    return { user, token };
  }

  async function createSampleGame(hostId: Types.ObjectId) {
    const now = new Date();
    const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

    return Game.create({
      hostId,
      sportKey,
      formatKey: 'singles',
      status: GameStatuses.OPEN,
      joinPolicy: JoinPolicies.OPEN,
      visibility: GameVisibilities.PUBLIC,
      minPlayers: 2,
      maxPlayers: 4,
      participantCount: 1,
      waitlistCount: 0,
      startsAt: futureStart,
      endsAt: futureEnd,
      location: {
        type: 'Point',
        coordinates: [77.6000, 12.9750],
      },
      ratingRange: { min: 1100, max: 1400, allowUnrated: true },
      isLocked: false,
      statusHistory: [],
    });
  }

  describe('GET /api/v1/explain/games/:gameId/eligibility', () => {
    it('returns standardized explanation and writes decision log', async () => {
      const { user: host } = await createPlayerWithProfile({ displayName: 'Host' });
      const game = await createSampleGame(new Types.ObjectId(host.id));
      const { token, user: searcher } = await createPlayerWithProfile({ displayName: 'Searcher' });

      const res = await request(app)
        .get(`/api/v1/explain/games/${game.id}/eligibility`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.decisionType).toBe(DecisionTypes.ELIGIBILITY_CHECK);
      expect(res.body.data.subjectId).toBe(game.id);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.factors).toBeInstanceOf(Array);
      expect(res.body.data.reasons).toBeInstanceOf(Array);

      // Verify decision log was created
      const log = await DecisionLog.findOne({
        actorId: searcher.id,
        decisionType: DecisionTypes.ELIGIBILITY_CHECK,
      });
      expect(log).not.toBeNull();
      expect(log?.subjectId).toBe(game.id);
    });

    it('returns 404 for non-existent game', async () => {
      const { token } = await createPlayerWithProfile({ displayName: 'Searcher' });
      const randomId = new Types.ObjectId().toString();

      const res = await request(app)
        .get(`/api/v1/explain/games/${randomId}/eligibility`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /api/v1/explain/games/:gameId/teams', () => {
    it('returns team balancing explanation for participant and blocks non-participants', async () => {
      const { user: host, token: hostToken } = await createPlayerWithProfile({ displayName: 'Host' });
      const { user: player1, token: player1Token } = await createPlayerWithProfile({ displayName: 'P1' });
      const { token: outsiderToken } = await createPlayerWithProfile({ displayName: 'Outsider' });

      const game = await createSampleGame(new Types.ObjectId(host.id));

      await GameParticipant.create({
        gameId: game._id,
        userId: new Types.ObjectId(player1.id),
        role: 'player',
        status: ParticipantStatuses.JOINED,
        joinedAt: new Date(),
        startsAt: game.startsAt,
        endsAt: game.endsAt,
      });

      await GameTeamFormation.create({
        gameId: game._id,
        sportKey: 'badminton',
        formatKey: 'singles',
        teams: [
          {
            sideKey: 'team_a',
            name: 'Team Alpha',
            players: [{ userId: new Types.ObjectId(host.id), displayName: 'Host', rating: 1250 }],
            ratingTotal: 1250,
            ratingAverage: 1250,
          },
          {
            sideKey: 'team_b',
            name: 'Team Beta',
            players: [{ userId: new Types.ObjectId(player1.id), displayName: 'P1', rating: 1250 }],
            ratingTotal: 1250,
            ratingAverage: 1250,
          },
        ],
        generatedBy: new Types.ObjectId(host.id),
        generatedAt: new Date(),
        balance: { difference: 0, method: 'snake_draft_elo' },
        reasons: ['Balanced by snake-draft algorithm with 0 rating difference'],
      });

      // 1. Host can view explanation
      const resHost = await request(app)
        .get(`/api/v1/explain/games/${game.id}/teams`)
        .set('Authorization', `Bearer ${hostToken}`);
      expect(resHost.status).toBe(HttpStatus.OK);
      expect(resHost.body.data.decisionType).toBe(DecisionTypes.TEAM_BALANCING);
      expect(resHost.body.data.metrics.difference).toBe(0);

      // 2. Joined participant can view explanation
      const resP1 = await request(app)
        .get(`/api/v1/explain/games/${game.id}/teams`)
        .set('Authorization', `Bearer ${player1Token}`);
      expect(resP1.status).toBe(HttpStatus.OK);

      // 3. Outsider receives 403 Forbidden
      const resOutsider = await request(app)
        .get(`/api/v1/explain/games/${game.id}/teams`)
        .set('Authorization', `Bearer ${outsiderToken}`);
      expect(resOutsider.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /api/v1/explain/ratings/:eventId', () => {
    it('explains rating movement for event owner and rejects unauthorized viewer', async () => {
      const { user: player, token: playerToken } = await createPlayerWithProfile({ displayName: 'Rater' });
      const { token: otherToken } = await createPlayerWithProfile({ displayName: 'Other' });

      const event = await RatingEvent.create({
        user: new Types.ObjectId(player.id),
        sport: sportId,
        matchResult: new Types.ObjectId(),
        oldRating: 1200,
        newRating: 1224,
        delta: 24,
        expectedScore: 0.45,
        outcomeScore: 1.0,
        ownTeamRating: 1200,
        opponentTeamRating: 1240,
        kUsed: 32,
        kBaseTier: 32,
        inactivityMultiplier: 1.0,
        movMultiplier: 1.2,
        gamesPlayedBefore: 8,
        bandBefore: { key: 'intermediate', label: 'Intermediate' },
        bandAfter: { key: 'intermediate', label: 'Intermediate' },
        voided: false,
      });

      // 1. Owner can view explanation
      const resOwner = await request(app)
        .get(`/api/v1/explain/ratings/${event.id}`)
        .set('Authorization', `Bearer ${playerToken}`);

      expect(resOwner.status).toBe(HttpStatus.OK);
      expect(resOwner.body.data.decisionType).toBe(DecisionTypes.RATING_ADJUSTMENT);
      expect(resOwner.body.data.metrics.delta).toBe(24);
      expect(resOwner.body.data.summary).toContain('+24');

      // 2. Another player receives 403 Forbidden
      const resOther = await request(app)
        .get(`/api/v1/explain/ratings/${event.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(resOther.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /api/v1/explain/decisions & /:id', () => {
    it('lists and retrieves decision logs for the user', async () => {
      const { user, token } = await createPlayerWithProfile({ displayName: 'Logger User' });
      const { token: otherToken } = await createPlayerWithProfile({ displayName: 'Other User' });

      const log = await DecisionLog.create({
        decisionType: DecisionTypes.RECOMMENDATION,
        subjectId: 'game-123',
        actorId: new Types.ObjectId(user.id),
        inputSnapshot: { sportKey: 'badminton' },
        outputDecision: { score: 0.95 },
        factors: [{ name: 'Skill Match', value: 0.95, weight: 0.35, impact: 'positive' }],
        metrics: { score: 0.95 },
        codes: ['high'],
        summary: 'Recommended with 95% match score',
        reasons: ['Close skill match'],
      });

      // 1. List logs
      const resList = await request(app)
        .get('/api/v1/explain/decisions')
        .set('Authorization', `Bearer ${token}`);

      expect(resList.status).toBe(HttpStatus.OK);
      expect(resList.body.data.logs).toHaveLength(1);
      expect(resList.body.data.total).toBe(1);

      // 2. Get single log by ID
      const resGet = await request(app)
        .get(`/api/v1/explain/decisions/${log.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resGet.status).toBe(HttpStatus.OK);
      expect(resGet.body.data.summary).toBe('Recommended with 95% match score');

      // 3. Other user receives 403 Forbidden
      const resOther = await request(app)
        .get(`/api/v1/explain/decisions/${log.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(resOther.status).toBe(HttpStatus.FORBIDDEN);
    });
  });
});
