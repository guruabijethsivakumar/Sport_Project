import { Types } from 'mongoose';
import { Notification } from '../models/notification.model.js';
import { domainEvents, type DomainEventPayload } from '../utils/domain-events.js';
import { emitToUser, type RealtimeNotificationEvent } from '../engine/websockets/index.js';
import { NotificationTypes, type NotificationType } from '../constants/notification-constants.js';
import { GameEventTypes } from '../constants/game-constants.js';
import { logger } from '../utils/logger.js';

/**
 * Create a notification in the database and push it via WebSocket.
 */
async function createAndEmit(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    const notification = await Notification.create({
      user: new Types.ObjectId(params.userId),
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
    });

    const event: RealtimeNotificationEvent = {
      id: notification.id,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      read: false,
      createdAt: notification.createdAt.toISOString(),
      data: params.data,
    };

    emitToUser(params.userId, event);
  } catch (err) {
    logger.error({ err, params }, 'Failed to create and emit notification');
  }
}

/**
 * Get paginated notifications for a user, along with unread count.
 */
export async function getNotifications(
  userId: string,
  page: number,
  limit: number,
): Promise<{
  notifications: Array<{
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    data?: Record<string, unknown>;
  }>;
  unreadCount: number;
  page: number;
  limit: number;
  totalCount: number;
}> {
  const userObjectId = new Types.ObjectId(userId);
  const skip = (page - 1) * limit;

  const [notifications, totalCount, unreadCount] = await Promise.all([
    Notification.find({ user: userObjectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ user: userObjectId }),
    Notification.countDocuments({ user: userObjectId, read: false }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: (n._id as Types.ObjectId).toString(),
      userId: n.user.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      data: n.data && Object.keys(n.data).length > 0 ? n.data : undefined,
    })),
    unreadCount,
    page,
    limit,
    totalCount,
  };
}

/**
 * Mark a single notification as read. Returns the updated notification or null if not found.
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<{ id: string; read: boolean } | null> {
  const notification = await Notification.findOneAndUpdate(
    { _id: new Types.ObjectId(notificationId), user: new Types.ObjectId(userId) },
    { read: true },
    { new: true },
  );

  if (!notification) return null;

  return {
    id: notification.id,
    read: notification.read,
  };
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
  const result = await Notification.updateMany(
    { user: new Types.ObjectId(userId), read: false },
    { read: true },
  );

  return { modifiedCount: result.modifiedCount };
}

// ─── Domain Event Listeners ────────────────────────────────────────────────────

function handleGameCancelled(event: DomainEventPayload): void {
  const data = event.data as {
    participantUserIds?: string[];
    gameName?: string;
    reason?: string;
  } | undefined;

  const participantUserIds = data?.participantUserIds || [];
  const gameName = data?.gameName || 'A game';

  for (const userId of participantUserIds) {
    createAndEmit({
      userId,
      type: NotificationTypes.GAME_CANCELLED,
      title: 'Game Cancelled',
      message: `${gameName} has been cancelled${data?.reason ? `: ${data.reason}` : '.'}`,
      data: { gameId: event.gameId, reason: data?.reason },
    });
  }
}

function handleParticipantJoined(event: DomainEventPayload): void {
  const data = event.data as {
    hostUserId?: string;
    playerName?: string;
    gameName?: string;
  } | undefined;

  if (data?.hostUserId && data.hostUserId !== event.actorId) {
    createAndEmit({
      userId: data.hostUserId,
      type: NotificationTypes.GAME_JOINED,
      title: 'New Player Joined',
      message: `${data.playerName || 'A player'} joined ${data.gameName || 'your game'}.`,
      data: { gameId: event.gameId, actorId: event.actorId },
    });
  }
}

function handleParticipantRequested(event: DomainEventPayload): void {
  const data = event.data as {
    hostUserId?: string;
    playerName?: string;
    gameName?: string;
  } | undefined;

  if (data?.hostUserId && data.hostUserId !== event.actorId) {
    createAndEmit({
      userId: data.hostUserId,
      type: NotificationTypes.GAME_INVITATION,
      title: 'Join Request Received',
      message: `${data.playerName || 'A player'} has requested to join ${data.gameName || 'your match'}.`,
      data: { gameId: event.gameId, actorId: event.actorId },
    });
  }
}

function handleGameConfirmed(event: DomainEventPayload): void {
  const data = event.data as {
    participantUserIds?: string[];
    gameName?: string;
  } | undefined;

  const participantUserIds = data?.participantUserIds || [];
  const gameName = data?.gameName || 'Your game';

  for (const userId of participantUserIds) {
    createAndEmit({
      userId,
      type: NotificationTypes.GAME_CONFIRMED,
      title: 'Game Confirmed',
      message: `${gameName} has been confirmed. Get ready!`,
      data: { gameId: event.gameId },
    });
  }
}

function handleResultSubmitted(event: DomainEventPayload): void {
  const data = event.data as {
    participantUserIds?: string[];
    whoMustActNext?: string[];
    submitterId?: string;
    proposedByUserId?: string;
    gameName?: string;
    scores?: unknown;
  } | undefined;

  const submitter = data?.submitterId || data?.proposedByUserId || event.actorId;
  const recipientIds =
    data?.whoMustActNext ||
    (data?.participantUserIds || []).filter((id) => id !== submitter);
  const gameName = data?.gameName || 'A game';

  for (const userId of recipientIds) {
    createAndEmit({
      userId,
      type: NotificationTypes.RESULT_SUBMITTED,
      title: 'Result Submitted',
      message: `A result has been submitted for ${gameName}. Please verify it.`,
      data: { gameId: event.gameId, scores: data?.scores },
    });
  }
}

function handleResultVerified(event: DomainEventPayload): void {
  const data = event.data as {
    participantUserIds?: string[];
    gameName?: string;
  } | undefined;

  const participantUserIds = data?.participantUserIds || [];
  const gameName = data?.gameName || 'A game';

  for (const userId of participantUserIds) {
    createAndEmit({
      userId,
      type: NotificationTypes.RESULT_VERIFIED,
      title: 'Result Verified',
      message: `The result for ${gameName} has been verified. Ratings updated.`,
      data: { gameId: event.gameId },
    });
  }
}

function handleResultDisputed(event: DomainEventPayload): void {
  const data = event.data as {
    participantUserIds?: string[];
    gameName?: string;
    disputedBy?: string;
    disputedByUserId?: string;
    reason?: string;
  } | undefined;

  const disputer = data?.disputedByUserId || data?.disputedBy || event.actorId;
  const participantUserIds = (data?.participantUserIds || []).filter(
    (id) => id !== disputer,
  );
  const gameName = data?.gameName || 'A game';

  for (const userId of participantUserIds) {
    createAndEmit({
      userId,
      type: NotificationTypes.RESULT_DISPUTED,
      title: 'Result Disputed',
      message: `The result for ${gameName} has been disputed${data?.reason ? `: ${data.reason}` : '.'}`,
      data: { gameId: event.gameId, reason: data?.reason },
    });
  }
}

function handleRatingUpdated(event: DomainEventPayload): void {
  const data = event.data as {
    userId?: string;
    sportName?: string;
    newRating?: number;
    ratingDelta?: number;
  } | undefined;

  const userId = data?.userId || event.actorId;
  if (!userId) return;

  const msg = data?.sportName
    ? `Your rating for ${data.sportName} updated${data.newRating !== undefined ? ` to ${data.newRating}` : ''}.`
    : `Your rating has been updated${data?.newRating !== undefined ? ` to ${data.newRating}` : ''}.`;

  createAndEmit({
    userId,
    type: NotificationTypes.RATING_CHANGE,
    title: 'Rating Updated',
    message: msg,
    data: {
      gameId: event.gameId,
      sportName: data?.sportName,
      newRating: data?.newRating,
      ratingDelta: data?.ratingDelta,
    },
  });
}

/**
 * Register all notification domain event listeners.
 * Should be called once at startup.
 */
export function registerNotificationListeners(): void {
  domainEvents.on(GameEventTypes.GAME_CANCELLED, handleGameCancelled);
  domainEvents.on('game.cancelled', handleGameCancelled);
  domainEvents.on(GameEventTypes.PARTICIPANT_JOINED, handleParticipantJoined);
  domainEvents.on('game.joined', handleParticipantJoined);
  domainEvents.on(GameEventTypes.PARTICIPANT_REQUESTED, handleParticipantRequested);
  domainEvents.on('participant_requested', handleParticipantRequested);
  domainEvents.on('game.requested', handleParticipantRequested);
  domainEvents.on(GameEventTypes.GAME_CONFIRMED, handleGameConfirmed);
  domainEvents.on('game.confirmed', handleGameConfirmed);
  domainEvents.on(GameEventTypes.RESULT_SUBMITTED, handleResultSubmitted);
  domainEvents.on('result_submitted', handleResultSubmitted);
  domainEvents.on(GameEventTypes.RESULT_VERIFIED, handleResultVerified);
  domainEvents.on('result_verified', handleResultVerified);
  domainEvents.on(GameEventTypes.RESULT_DISPUTED, handleResultDisputed);
  domainEvents.on('result_disputed', handleResultDisputed);
  domainEvents.on('rating.updated', handleRatingUpdated);
  domainEvents.on('rating_updated', handleRatingUpdated);
  logger.info('Notification domain event listeners registered');
}

/**
 * Unregister all notification domain event listeners (for testing cleanup).
 */
export function unregisterNotificationListeners(): void {
  domainEvents.off(GameEventTypes.GAME_CANCELLED, handleGameCancelled);
  domainEvents.off('game.cancelled', handleGameCancelled);
  domainEvents.off(GameEventTypes.PARTICIPANT_JOINED, handleParticipantJoined);
  domainEvents.off('game.joined', handleParticipantJoined);
  domainEvents.off(GameEventTypes.PARTICIPANT_REQUESTED, handleParticipantRequested);
  domainEvents.off('participant_requested', handleParticipantRequested);
  domainEvents.off('game.requested', handleParticipantRequested);
  domainEvents.off(GameEventTypes.GAME_CONFIRMED, handleGameConfirmed);
  domainEvents.off('game.confirmed', handleGameConfirmed);
  domainEvents.off(GameEventTypes.RESULT_SUBMITTED, handleResultSubmitted);
  domainEvents.off('result_submitted', handleResultSubmitted);
  domainEvents.off(GameEventTypes.RESULT_VERIFIED, handleResultVerified);
  domainEvents.off('result_verified', handleResultVerified);
  domainEvents.off(GameEventTypes.RESULT_DISPUTED, handleResultDisputed);
  domainEvents.off('result_disputed', handleResultDisputed);
  domainEvents.off('rating.updated', handleRatingUpdated);
  domainEvents.off('rating_updated', handleRatingUpdated);
}

// Export createAndEmit for direct use / testing
export { createAndEmit };
