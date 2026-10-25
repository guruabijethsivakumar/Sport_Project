import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as ClientSocket, type Socket as ClientSocketType } from 'socket.io-client';
import request from 'supertest';
import { Types } from 'mongoose';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { app } from '../src/app.js';
import { HttpStatus } from '../src/constants/http-status.js';
import { ErrorCodes } from '../src/constants/error-codes.js';
import { NotificationTypes } from '../src/constants/notification-constants.js';
import { GameEventTypes } from '../src/constants/game-constants.js';
import { Notification } from '../src/models/notification.model.js';
import { tokenService } from '../src/services/token.service.js';
import { domainEvents } from '../src/utils/domain-events.js';
import {
  initializeWebSockets,
  resetWebSocketState,
  getUserSocketMap,
  type RealtimeNotificationEvent,
} from '../src/engine/websockets/index.js';
import {
  registerNotificationListeners,
  unregisterNotificationListeners,
  createAndEmit,
} from '../src/services/notification.service.js';
import { createTestUser } from './fixtures/user.fixture.js';

describe('Module 10: Real-time & Notifications', () => {
  let server: http.Server;
  let serverPort: number;
  let serverUrl: string;
  let testUser1: any;
  let token1: string;
  let testUser2: any;
  let token2: string;

  beforeAll(async () => {
    // Start HTTP server with WebSocket support on an ephemeral port
    server = http.createServer(app);
    initializeWebSockets(server);
    registerNotificationListeners();

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as AddressInfo).port;
        serverUrl = `http://localhost:${serverPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    unregisterNotificationListeners();
    resetWebSocketState();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    const u1 = await createTestUser({ email: 'player1@test.com', name: 'Player One' });
    testUser1 = u1.user;
    token1 = tokenService.generateAccessToken({
      userId: testUser1.id,
      role: testUser1.role,
      email: testUser1.email,
    });

    const u2 = await createTestUser({ email: 'player2@test.com', name: 'Player Two' });
    testUser2 = u2.user;
    token2 = tokenService.generateAccessToken({
      userId: testUser2.id,
      role: testUser2.role,
      email: testUser2.email,
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. REST API: GET /api/v1/notifications
  // ═════════════════════════════════════════════════════════════════════════════
  describe('GET /api/v1/notifications', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });

    it('should return empty list and zero unread count when user has no notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toEqual([]);
      expect(res.body.data.unreadCount).toBe(0);
      expect(res.body.data.totalCount).toBe(0);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);
    });

    it('should return notifications strictly for the authenticated user, sorted newest first', async () => {
      const now = Date.now();
      // User 1 notifications
      await Notification.create({
        user: testUser1._id,
        type: NotificationTypes.GAME_CONFIRMED,
        title: 'Older Game Confirmed',
        message: 'Your badminton game is confirmed.',
        read: true,
        createdAt: new Date(now - 60000),
      });

      await Notification.create({
        user: testUser1._id,
        type: NotificationTypes.RATING_CHANGE,
        title: 'Newer Rating Updated',
        message: 'Your rating updated to 1250.',
        read: false,
        createdAt: new Date(now),
      });

      // User 2 notification (isolation check)
      await Notification.create({
        user: testUser2._id,
        type: NotificationTypes.SYSTEM,
        title: 'User 2 Notice',
        message: 'Should not appear in User 1 list.',
        read: false,
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.data.notifications).toHaveLength(2);
      expect(res.body.data.unreadCount).toBe(1);
      expect(res.body.data.totalCount).toBe(2);

      // Verify newest first
      expect(res.body.data.notifications[0].title).toBe('Newer Rating Updated');
      expect(res.body.data.notifications[0].read).toBe(false);
      expect(res.body.data.notifications[0].userId).toBe(testUser1.id);
      expect(res.body.data.notifications[1].title).toBe('Older Game Confirmed');
      expect(res.body.data.notifications[1].read).toBe(true);
    });

    it('should paginate correctly with page and limit query parameters', async () => {
      // Create 5 notifications for user 1
      for (let i = 1; i <= 5; i++) {
        await Notification.create({
          user: testUser1._id,
          type: NotificationTypes.GAME_UPDATE,
          title: `Update ${i}`,
          message: `Details ${i}`,
          read: false,
          createdAt: new Date(Date.now() + i * 1000),
        });
      }

      const resPage1 = await request(app)
        .get('/api/v1/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${token1}`);

      expect(resPage1.status).toBe(HttpStatus.OK);
      expect(resPage1.body.data.notifications).toHaveLength(2);
      expect(resPage1.body.data.notifications[0].title).toBe('Update 5');
      expect(resPage1.body.data.notifications[1].title).toBe('Update 4');
      expect(resPage1.body.data.totalCount).toBe(5);
      expect(resPage1.body.data.unreadCount).toBe(5);

      const resPage2 = await request(app)
        .get('/api/v1/notifications?page=2&limit=2')
        .set('Authorization', `Bearer ${token1}`);

      expect(resPage2.status).toBe(HttpStatus.OK);
      expect(resPage2.body.data.notifications).toHaveLength(2);
      expect(resPage2.body.data.notifications[0].title).toBe('Update 3');
      expect(resPage2.body.data.notifications[1].title).toBe('Update 2');

      const resPage3 = await request(app)
        .get('/api/v1/notifications?page=3&limit=2')
        .set('Authorization', `Bearer ${token1}`);

      expect(resPage3.status).toBe(HttpStatus.OK);
      expect(resPage3.body.data.notifications).toHaveLength(1);
      expect(resPage3.body.data.notifications[0].title).toBe('Update 1');
    });

    it('should reject invalid pagination parameters with 400', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?page=0')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. REST API: PATCH /api/v1/notifications/:id/read
  // ═════════════════════════════════════════════════════════════════════════════
  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const validObjectId = new Types.ObjectId().toString();
      const res = await request(app).patch(`/api/v1/notifications/${validObjectId}/read`);
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 with NOTIFICATION_NOT_FOUND when notification does not exist', async () => {
      const nonExistentId = new Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/v1/notifications/${nonExistentId}/read`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.body.error.code).toBe(ErrorCodes.NOTIFICATION_NOT_FOUND);
    });

    it('should return 404 when trying to mark another user notification as read', async () => {
      const notifUser2 = await Notification.create({
        user: testUser2._id,
        type: NotificationTypes.SYSTEM,
        title: 'Secret Notice',
        message: 'Belongs to user 2',
        read: false,
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notifUser2.id}/read`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.body.error.code).toBe(ErrorCodes.NOTIFICATION_NOT_FOUND);

      // Verify it was not marked read
      const check = await Notification.findById(notifUser2._id);
      expect(check?.read).toBe(false);
    });

    it('should mark an unread notification as read and decrement unreadCount', async () => {
      const notif = await Notification.create({
        user: testUser1._id,
        type: NotificationTypes.GAME_CANCELLED,
        title: 'Match Cancelled',
        message: 'Your badminton game was cancelled.',
        read: false,
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.read).toBe(true);

      // Verify in database
      const updated = await Notification.findById(notif._id);
      expect(updated?.read).toBe(true);

      // Verify list endpoint shows unreadCount = 0
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token1}`);
      expect(listRes.body.data.unreadCount).toBe(0);
    });

    it('should be idempotent when marking an already read notification', async () => {
      const notif = await Notification.create({
        user: testUser1._id,
        type: NotificationTypes.GAME_CONFIRMED,
        title: 'Already Read',
        message: 'Already read message',
        read: true,
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.data.read).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. REST API: PATCH /api/v1/notifications/read-all
  // ═════════════════════════════════════════════════════════════════════════════
  describe('PATCH /api/v1/notifications/read-all', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).patch('/api/v1/notifications/read-all');
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should mark all notifications for the authenticated user as read', async () => {
      // 3 unread for User 1
      await Notification.create([
        { user: testUser1._id, type: NotificationTypes.SYSTEM, title: 'N1', message: 'M1', read: false },
        { user: testUser1._id, type: NotificationTypes.SYSTEM, title: 'N2', message: 'M2', read: false },
        { user: testUser1._id, type: NotificationTypes.SYSTEM, title: 'N3', message: 'M3', read: false },
      ]);

      // 2 unread for User 2 (should remain unread)
      await Notification.create([
        { user: testUser2._id, type: NotificationTypes.SYSTEM, title: 'U2-N1', message: 'M1', read: false },
        { user: testUser2._id, type: NotificationTypes.SYSTEM, title: 'U2-N2', message: 'M2', read: false },
      ]);

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.modifiedCount).toBe(3);

      // Verify User 1 unreadCount is now 0
      const list1 = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token1}`);
      expect(list1.body.data.unreadCount).toBe(0);

      // Verify User 2 unreadCount is still 2
      const list2 = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token2}`);
      expect(list2.body.data.unreadCount).toBe(2);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. WebSocket: Authentication & Connection Management
  // ═════════════════════════════════════════════════════════════════════════════
  describe('WebSocket Authentication & Connection', () => {
    let clientSocket: ClientSocketType | null = null;

    afterEach(() => {
      if (clientSocket && clientSocket.connected) {
        clientSocket.disconnect();
      }
      clientSocket = null;
    });

    it('should reject connection when no token is provided', async () => {
      await new Promise<void>((resolve) => {
        clientSocket = ClientSocket(serverUrl, {
          transports: ['websocket'],
          reconnection: false,
        });

        clientSocket.on('connect_error', (err) => {
          expect(err.message).toBe('Authentication required');
          resolve();
        });

        clientSocket.on('connect', () => {
          throw new Error('Should not have connected without token');
        });
      });
    });

    it('should reject connection when an invalid/expired token is provided', async () => {
      await new Promise<void>((resolve) => {
        clientSocket = ClientSocket(serverUrl, {
          transports: ['websocket'],
          auth: { token: 'invalid.jwt.token' },
          reconnection: false,
        });

        clientSocket.on('connect_error', (err) => {
          expect(err.message).toBe('Authentication failed');
          resolve();
        });

        clientSocket.on('connect', () => {
          throw new Error('Should not have connected with invalid token');
        });
      });
    });

    it('should successfully authenticate and connect with a valid token in auth payload', async () => {
      await new Promise<void>((resolve) => {
        clientSocket = ClientSocket(serverUrl, {
          transports: ['websocket'],
          auth: { token: token1 },
          reconnection: false,
        });

        clientSocket.on('connect', () => {
          expect(clientSocket!.connected).toBe(true);
          const socketMap = getUserSocketMap();
          expect(socketMap.has(testUser1.id)).toBe(true);
          expect(socketMap.get(testUser1.id)!.has(clientSocket!.id!)).toBe(true);
          resolve();
        });
      });
    });

    it('should successfully authenticate with token in query params', async () => {
      await new Promise<void>((resolve) => {
        clientSocket = ClientSocket(serverUrl, {
          transports: ['websocket'],
          query: { token: token1 },
          reconnection: false,
        });

        clientSocket.on('connect', () => {
          expect(clientSocket!.connected).toBe(true);
          resolve();
        });
      });
    });

    it('should clean up user socket map when client disconnects', async () => {
      await new Promise<void>((resolve) => {
        clientSocket = ClientSocket(serverUrl, {
          transports: ['websocket'],
          auth: { token: token1 },
          reconnection: false,
        });

        clientSocket.on('connect', () => {
          const socketMapBefore = getUserSocketMap();
          expect(socketMapBefore.has(testUser1.id)).toBe(true);

          clientSocket!.disconnect();
        });

        clientSocket.on('disconnect', () => {
          // Allow small tick for server disconnect listener to process
          setTimeout(() => {
            const socketMapAfter = getUserSocketMap();
            expect(socketMapAfter.has(testUser1.id)).toBe(false);
            resolve();
          }, 50);
        });
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. WebSocket: Real-time Event Delivery & Isolation
  // ═════════════════════════════════════════════════════════════════════════════
  describe('WebSocket Real-time Event Delivery', () => {
    let socket1: ClientSocketType;
    let socket2: ClientSocketType;

    beforeEach(async () => {
      // Connect both user 1 and user 2 clients
      await Promise.all([
        new Promise<void>((resolve) => {
          socket1 = ClientSocket(serverUrl, {
            transports: ['websocket'],
            auth: { token: token1 },
            reconnection: false,
          });
          socket1.on('connect', () => resolve());
        }),
        new Promise<void>((resolve) => {
          socket2 = ClientSocket(serverUrl, {
            transports: ['websocket'],
            auth: { token: token2 },
            reconnection: false,
          });
          socket2.on('connect', () => resolve());
        }),
      ]);
    });

    afterEach(() => {
      if (socket1 && socket1.connected) socket1.disconnect();
      if (socket2 && socket2.connected) socket2.disconnect();
    });

    it('should deliver real-time notification to the target user and NOT to other users', async () => {
      let user2Received = false;
      socket2.on('notification', () => {
        user2Received = true;
      });

      const eventPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        socket1.on('notification', (payload: RealtimeNotificationEvent) => {
          resolve(payload);
        });
      });

      await createAndEmit({
        userId: testUser1.id,
        type: NotificationTypes.GAME_CONFIRMED,
        title: 'Game is on!',
        message: 'Your badminton game at Marina Smash Arena is confirmed.',
        data: { gameId: 'g123' },
      });

      const received = await eventPromise;
      expect(received).toBeDefined();
      expect(received.userId).toBe(testUser1.id);
      expect(received.type).toBe(NotificationTypes.GAME_CONFIRMED);
      expect(received.title).toBe('Game is on!');
      expect(received.message).toBe('Your badminton game at Marina Smash Arena is confirmed.');
      expect(received.read).toBe(false);
      expect(received.data).toEqual({ gameId: 'g123' });

      // Ensure user 2 did NOT receive user 1's notification
      await new Promise((r) => setTimeout(r, 50));
      expect(user2Received).toBe(false);

      // Verify DB record was also persisted
      const saved = await Notification.findOne({ user: testUser1._id });
      expect(saved).not.toBeNull();
      expect(saved?.title).toBe('Game is on!');
    });

    it('should also emit notification.received with contract format', async () => {
      const contractPromise = new Promise<any>((resolve) => {
        socket1.on('notification.received', (wrapper: any) => {
          resolve(wrapper);
        });
      });

      await createAndEmit({
        userId: testUser1.id,
        type: NotificationTypes.RATING_UPDATED,
        title: 'Rating Updated (+25)',
        message: 'Your Elo increased to 1225.',
      });

      const wrapper = await contractPromise;
      expect(wrapper.eventType).toBe('notification.received');
      expect(wrapper.notification.userId).toBe(testUser1.id);
      expect(wrapper.notification.title).toBe('Rating Updated (+25)');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. Domain Event Listeners: Triggering Notifications & WebSocket Push
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Domain Event Listeners Integration', () => {
    let clientSocket: ClientSocketType;

    beforeEach(async () => {
      await new Promise<void>((resolve) => {
        clientSocket = ClientSocket(serverUrl, {
          transports: ['websocket'],
          auth: { token: token1 },
          reconnection: false,
        });
        clientSocket.on('connect', () => resolve());
      });
    });

    afterEach(() => {
      if (clientSocket && clientSocket.connected) clientSocket.disconnect();
    });

    it('should handle game_cancelled event: saves notification & emits socket event', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: GameEventTypes.GAME_CANCELLED,
        gameId: 'game-100',
        timestamp: new Date(),
        data: {
          participantUserIds: [testUser1.id],
          gameName: 'Friday Football',
          reason: 'Rain forecast',
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.GAME_CANCELLED);
      expect(notif.title).toBe('Game Cancelled');
      expect(notif.message).toContain('Friday Football has been cancelled: Rain forecast');

      // Verify persisted in DB
      const dbNotif = await Notification.findOne({
        user: testUser1._id,
        type: NotificationTypes.GAME_CANCELLED,
      });
      expect(dbNotif).not.toBeNull();
      expect(dbNotif?.data).toEqual({ gameId: 'game-100', reason: 'Rain forecast' });
    });

    it('should handle participant_joined event: notifies host', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: GameEventTypes.PARTICIPANT_JOINED,
        gameId: 'game-200',
        actorId: testUser2.id,
        timestamp: new Date(),
        data: {
          hostUserId: testUser1.id,
          playerName: 'Player Two',
          gameName: 'Saturday Cricket',
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.GAME_JOINED);
      expect(notif.title).toBe('New Player Joined');
      expect(notif.message).toContain('Player Two joined Saturday Cricket');
    });

    it('should handle participant_requested event: notifies host and not requester', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: GameEventTypes.PARTICIPANT_REQUESTED,
        gameId: 'game-201',
        actorId: testUser2.id,
        timestamp: new Date(),
        data: {
          hostUserId: testUser1.id,
          playerName: 'Player Two',
          gameName: 'Saturday Cricket',
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.GAME_INVITATION);
      expect(notif.title).toBe('Join Request Received');
      expect(notif.message).toContain('Player Two has requested to join Saturday Cricket');
    });

    it('should handle game_confirmed event: notifies participants', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: GameEventTypes.GAME_CONFIRMED,
        gameId: 'game-300',
        timestamp: new Date(),
        data: {
          participantUserIds: [testUser1.id],
          gameName: 'Sunday Badminton',
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.GAME_CONFIRMED);
      expect(notif.title).toBe('Game Confirmed');
      expect(notif.message).toContain('Sunday Badminton has been confirmed');
    });

    it('should handle game.result_submitted event: notifies whoMustActNext excluding submitter', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: 'game.result_submitted',
        gameId: 'game-400',
        actorId: testUser2.id,
        timestamp: new Date(),
        data: {
          whoMustActNext: [testUser1.id],
          proposedByUserId: testUser2.id,
          gameName: 'Tournament Match',
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.RESULT_SUBMITTED);
      expect(notif.title).toBe('Result Submitted');
      expect(notif.message).toContain('A result has been submitted');
    });

    it('should handle game.result_verified event: notifies participants', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: 'game.result_verified',
        gameId: 'game-500',
        actorId: testUser2.id,
        timestamp: new Date(),
        data: {
          participantUserIds: [testUser1.id],
          gameName: 'Tournament Match',
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.RESULT_VERIFIED);
      expect(notif.title).toBe('Result Verified');
      expect(notif.message).toContain('The result for Tournament Match has been verified');
    });

    it('should handle game.result_disputed event: notifies other participants', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: 'game.result_disputed',
        gameId: 'game-600',
        actorId: testUser2.id,
        timestamp: new Date(),
        data: {
          participantUserIds: [testUser1.id, testUser2.id],
          disputedByUserId: testUser2.id,
          gameName: 'Tournament Match',
          reason: 'Score discrepancy',
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.RESULT_DISPUTED);
      expect(notif.title).toBe('Result Disputed');
      expect(notif.message).toContain('Score discrepancy');
    });

    it('should handle rating.updated event: notifies the rated player', async () => {
      const notifPromise = new Promise<RealtimeNotificationEvent>((resolve) => {
        clientSocket.on('notification', (n) => resolve(n));
      });

      domainEvents.emit({
        type: 'rating.updated',
        gameId: 'game-700',
        timestamp: new Date(),
        data: {
          userId: testUser1.id,
          sportName: 'Badminton',
          newRating: 1350,
          ratingDelta: 35,
        },
      });

      const notif = await notifPromise;
      expect(notif.type).toBe(NotificationTypes.RATING_CHANGE);
      expect(notif.title).toBe('Rating Updated');
      expect(notif.message).toContain('Your rating for Badminton updated to 1350');
      expect(notif.data).toEqual({
        gameId: 'game-700',
        sportName: 'Badminton',
        newRating: 1350,
        ratingDelta: 35,
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 7. Notification Model: Schema, TTL and Index Verifications
  // ═════════════════════════════════════════════════════════════════════════════
  describe('Notification Model & Indexes', () => {
    it('should reject creation without required fields', async () => {
      const invalid = new Notification({});
      await expect(invalid.validate()).rejects.toThrow();
    });

    it('should set default values for read (false) and data ({})', async () => {
      const notif = await Notification.create({
        user: testUser1._id,
        type: NotificationTypes.SYSTEM,
        title: 'Welcome',
        message: 'Welcome to PlayMatch!',
      });

      expect(notif.read).toBe(false);
      expect(notif.data).toEqual({});
      expect(notif.createdAt).toBeInstanceOf(Date);
    });

    it('should have TTL and compound indexes configured on schema', async () => {
      const indexes = Notification.schema.indexes();
      // Check user + createdAt index
      const hasUserCreatedAtIndex = indexes.some(
        ([idx]) => idx.user === 1 && idx.createdAt === -1,
      );
      expect(hasUserCreatedAtIndex).toBe(true);

      // Check user + read index
      const hasUserReadIndex = indexes.some(
        ([idx]) => idx.user === 1 && idx.read === 1,
      );
      expect(hasUserReadIndex).toBe(true);

      // Check TTL index
      const ttlIndex = indexes.find(
        ([idx, opts]) => idx.createdAt === 1 && opts?.expireAfterSeconds !== undefined,
      );
      expect(ttlIndex).toBeDefined();
      expect(ttlIndex?.[1]?.expireAfterSeconds).toBe(30 * 24 * 60 * 60);
    });
  });
});
