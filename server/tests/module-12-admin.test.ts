import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { app } from '../src/app.js';
import { HttpStatus } from '../src/constants/http-status.js';
import { Roles } from '../src/constants/roles.js';
import { UserStatuses } from '../src/constants/user-status.js';
import {
  GameStatuses,
  JoinPolicies,
  GameVisibilities,
  ParticipantStatuses,
  CancellationReasonCodes,
} from '../src/constants/game-constants.js';
import {
  ResultStatuses,
  RatingStatuses,
} from '../src/constants/result-constants.js';
import { tokenService } from '../src/services/token.service.js';
import { createTestUser } from './fixtures/user.fixture.js';
import { createTestSport } from './fixtures/sport.fixture.js';
import { User } from '../src/models/user.model.js';
import { RefreshSession } from '../src/models/refresh-session.model.js';
import { Game } from '../src/models/game.model.js';
import { GameParticipant } from '../src/models/game-participant.model.js';
import { GameResult } from '../src/models/game-result.model.js';
import { Rating } from '../src/models/rating.model.js';

describe('Module 12: Admin & Moderation API Endpoints', () => {
  let adminUser: any;
  let adminToken: string;
  let playerUser: any;
  let playerToken: string;
  let sportId: Types.ObjectId;
  let sportKey: string;

  beforeEach(async () => {
    // 1. Create admin user
    const adminRes = await createTestUser({
      name: 'Platform Admin',
      email: 'admin@playmatch.test',
      role: Roles.ADMIN,
    });
    adminUser = adminRes.user;
    adminToken = tokenService.generateAccessToken({
      userId: adminUser.id,
      role: adminUser.role,
      email: adminUser.email,
    });

    // 2. Create standard player user
    const playerRes = await createTestUser({
      name: 'Player One',
      email: 'player1@playmatch.test',
      role: Roles.PLAYER,
    });
    playerUser = playerRes.user;
    playerToken = tokenService.generateAccessToken({
      userId: playerUser.id,
      role: playerUser.role,
      email: playerUser.email,
    });

    // 3. Create test sport
    const sport = await createTestSport({ key: 'badminton', name: 'Badminton' });
    sportId = sport._id;
    sportKey = sport.key;
  });

  describe('Authorization and Access Control', () => {
    it('rejects unauthenticated requests to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard/stats');
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-admin players with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${playerToken}`);

      expect(res.status).toBe(HttpStatus.FORBIDDEN);
      expect(res.body.success).toBe(false);
    });

    it('allows admin users access to dashboard stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('users');
      expect(res.body.data).toHaveProperty('games');
      expect(res.body.data).toHaveProperty('venues');
      expect(res.body.data).toHaveProperty('disputes');
      expect(res.body.data.users.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Moderation', () => {
    it('lists users with pagination and search filter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?search=Player&role=player')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users).toBeInstanceOf(Array);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('prevents an admin from suspending their own account', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${adminUser.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Self suspension test' });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.error.code).toBe('CANNOT_MODERATE_SELF');
    });

    it('suspends a user and immediately revokes all active refresh sessions', async () => {
      // Create active refresh session for target user
      await RefreshSession.create({
        user: playerUser._id,
        tokenHash: 'hashed-test-token-123',
        family: 'test-family-123',
        clientType: 'web',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const res = await request(app)
        .post(`/api/v1/admin/users/${playerUser.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Terms of service violation' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(UserStatuses.SUSPENDED);

      // Verify DB update
      const updatedUser = await User.findById(playerUser.id);
      expect(updatedUser?.status).toBe(UserStatuses.SUSPENDED);

      // Verify active sessions revoked
      const activeSessions = await RefreshSession.find({
        user: playerUser._id,
        revokedAt: null,
      });
      expect(activeSessions.length).toBe(0);

      // Verify suspended user is rejected on authenticated routes
      const playerAccessRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${playerToken}`);

      expect(playerAccessRes.status).toBe(HttpStatus.FORBIDDEN);
      expect(playerAccessRes.body.error.code).toBe('AUTH_ACCOUNT_SUSPENDED');
    });

    it('reinstates a suspended user', async () => {
      // Suspend player first
      playerUser.status = UserStatuses.SUSPENDED;
      await playerUser.save();

      const res = await request(app)
        .post(`/api/v1/admin/users/${playerUser.id}/reinstate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Appeal accepted' });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(UserStatuses.ACTIVE);

      const refreshed = await User.findById(playerUser.id);
      expect(refreshed?.status).toBe(UserStatuses.ACTIVE);
    });

    it('prevents an admin from changing their own role', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: Roles.PLAYER });

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.body.error.code).toBe('CANNOT_MODIFY_OWN_ROLE');
    });

    it('updates a target user role', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${playerUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: Roles.VENUE_OWNER });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(Roles.VENUE_OWNER);

      const refreshed = await User.findById(playerUser.id);
      expect(refreshed?.role).toBe(Roles.VENUE_OWNER);
    });
  });

  describe('Game Moderation', () => {
    it('lists games and allows admin to force-cancel a game', async () => {
      const now = new Date();
      const startsAt = new Date(now.getTime() + 7200000);
      const endsAt = new Date(startsAt.getTime() + 3600000);

      const game = await Game.create({
        sportKey,
        sport: sportId,
        formatKey: 'singles',
        startsAt,
        endsAt,
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
        },
        joinPolicy: JoinPolicies.OPEN,
        visibility: GameVisibilities.PUBLIC,
        status: GameStatuses.OPEN,
        hostId: playerUser._id,
        minPlayers: 2,
        maxPlayers: 2,
        currentPlayersCount: 1,
      });

      await GameParticipant.create({
        gameId: game._id,
        userId: playerUser._id,
        role: 'host',
        status: ParticipantStatuses.JOINED,
        joinedAt: now,
        startsAt,
        endsAt,
      });

      // 1. List games
      const listRes = await request(app)
        .get('/api/v1/admin/games')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(HttpStatus.OK);
      expect(listRes.body.data.games.length).toBeGreaterThanOrEqual(1);

      // 2. Admin cancel game
      const cancelRes = await request(app)
        .post(`/api/v1/admin/games/${game.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Inappropriate game title/behavior' });

      expect(cancelRes.status).toBe(HttpStatus.OK);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.status).toBe(GameStatuses.CANCELLED);
      expect(cancelRes.body.data.cancellation.reasonCode).toBe(
        CancellationReasonCodes.ADMIN_ACTION,
      );
    });
  });

  describe('Dispute Resolution', () => {
    let opponentUser: any;
    let disputedGame: any;

    beforeEach(async () => {
      const oppRes = await createTestUser({
        name: 'Player Two',
        email: 'player2@playmatch.test',
        role: Roles.PLAYER,
      });
      opponentUser = oppRes.user;

      // Seed initial ratings for both players
      await Rating.create({
        user: playerUser._id,
        sport: sportId,
        rating: 1500,
        seedRating: 1500,
        seedBandKey: 'intermediate',
        gamesPlayed: 1,
        wins: 0,
        losses: 0,
        draws: 0,
      });

      await Rating.create({
        user: opponentUser._id,
        sport: sportId,
        rating: 1500,
        seedRating: 1500,
        seedBandKey: 'intermediate',
        gamesPlayed: 1,
        wins: 0,
        losses: 0,
        draws: 0,
      });

      const now = new Date();
      const startsAt = new Date(now.getTime() - 7200000);
      const endsAt = new Date(now.getTime() - 3600000);

      disputedGame = await Game.create({
        sportKey,
        sport: sportId,
        formatKey: 'singles',
        startsAt,
        endsAt,
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
        },
        joinPolicy: JoinPolicies.OPEN,
        visibility: GameVisibilities.PUBLIC,
        status: GameStatuses.COMPLETED,
        hostId: playerUser._id,
        minPlayers: 2,
        maxPlayers: 2,
        currentPlayersCount: 2,
      });

      await GameParticipant.create([
        {
          gameId: disputedGame._id,
          userId: playerUser._id,
          role: 'host',
          status: ParticipantStatuses.JOINED,
          joinedAt: startsAt,
          startsAt,
          endsAt,
          sideKey: 'teamA',
        },
        {
          gameId: disputedGame._id,
          userId: opponentUser._id,
          role: 'player',
          status: ParticipantStatuses.JOINED,
          joinedAt: startsAt,
          startsAt,
          endsAt,
          sideKey: 'teamB',
        },
      ]);
    });

    it('lists disputed matches and allows admin to force-resolve a dispute', async () => {
      // Create disputed GameResult
      await GameResult.create({
        gameId: disputedGame._id,
        status: ResultStatuses.DISPUTED,
        ratingStatus: RatingStatuses.NOT_PROCESSED,
        proposal: {
          proposedByUserId: playerUser._id,
          proposedAt: new Date(),
          scores: [
            { sideKey: 'teamA', score: 21, winner: true },
            { sideKey: 'teamB', score: 18, winner: false },
          ],
          notes: 'Contested line call on match point',
        },
        whoMustActNext: [opponentUser._id],
        disputedAt: new Date(),
        disputedByUserId: opponentUser._id,
      });

      // 1. List disputes
      const listRes = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(HttpStatus.OK);
      expect(listRes.body.data.disputes.length).toBeGreaterThanOrEqual(1);

      // 2. Admin force-resolve dispute
      const resolveRes = await request(app)
        .post(`/api/v1/admin/disputes/${disputedGame.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'accept_proposal',
          notes: 'Referee camera review confirms player 1 winner',
        });

      expect(resolveRes.status).toBe(HttpStatus.OK);
      expect(resolveRes.body.success).toBe(true);
      expect(resolveRes.body.data.status).toBe(ResultStatuses.RESOLVED);
      expect(resolveRes.body.data.ratingStatus).toBe(RatingStatuses.APPLIED);

      // Verify in DB
      const refreshedResult = await GameResult.findOne({
        gameId: disputedGame._id,
      });
      expect(refreshedResult?.status).toBe(ResultStatuses.RESOLVED);
      expect(refreshedResult?.ratingStatus).toBe(RatingStatuses.APPLIED);
    });

    it('allows admin to void a disputed match result', async () => {
      // Create disputed GameResult
      await GameResult.create({
        gameId: disputedGame._id,
        status: ResultStatuses.DISPUTED,
        ratingStatus: RatingStatuses.NOT_PROCESSED,
        proposal: {
          proposedByUserId: playerUser._id,
          proposedAt: new Date(),
          scores: [
            { sideKey: 'teamA', score: 10, winner: false },
            { sideKey: 'teamB', score: 10, winner: false },
          ],
          notes: 'Equipment failure midway',
        },
        whoMustActNext: [opponentUser._id],
        disputedAt: new Date(),
        disputedByUserId: opponentUser._id,
      });

      const voidRes = await request(app)
        .post(`/api/v1/admin/disputes/${disputedGame.id}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Game abandoned due to severe weather/equipment' });

      expect(voidRes.status).toBe(HttpStatus.OK);
      expect(voidRes.body.success).toBe(true);
      expect(voidRes.body.data.status).toBe(ResultStatuses.VOIDED);
      expect(voidRes.body.data.ratingStatus).toBe(RatingStatuses.VOIDED);

      const refreshedResult = await GameResult.findOne({
        gameId: disputedGame._id,
      });
      expect(refreshedResult?.status).toBe(ResultStatuses.VOIDED);
    });
  });
});
