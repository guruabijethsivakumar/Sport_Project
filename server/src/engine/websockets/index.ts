import type http from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { tokenService } from '../../services/token.service.js';
import { logger } from '../../utils/logger.js';
import type { NotificationType } from '../../constants/notification-constants.js';

/**
 * Payload format for real-time notification events emitted via WebSocket.
 */
export interface RealtimeNotificationEvent {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

let io: SocketIOServer | null = null;

/**
 * Maps userId → Set of socket IDs for targeted event emission.
 * A single user may have multiple connected clients (tabs, devices).
 */
const userSocketMap = new Map<string, Set<string>>();

/**
 * Initialize Socket.IO on the given HTTP server with JWT-based authentication.
 */
export function initializeWebSockets(server: http.Server): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware: validates JWT before allowing connection
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.query?.token as string | undefined) ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = tokenService.verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      next();
    } catch (err) {
      logger.warn({ err }, 'WebSocket authentication failed');
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    logger.debug({ userId, socketId: socket.id }, 'WebSocket client connected');

    // Join user-specific room for targeted emissions
    socket.join(userId);

    // Track socket in the user map
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId)!.add(socket.id);

    socket.on('disconnect', () => {
      logger.debug({ userId, socketId: socket.id }, 'WebSocket client disconnected');
      const sockets = userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(userId);
        }
      }
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * Emit a notification event to a specific user's room.
 * No-ops gracefully if the user is not connected.
 */
export function emitToUser(userId: string, event: RealtimeNotificationEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot emit to user');
    return;
  }
  io.to(userId).emit('notification', event);
  io.to(userId).emit('notification.received', {
    eventType: 'notification.received',
    notification: event,
  });
  logger.debug({ userId, notificationId: event.id }, 'Emitted notification via WebSocket');
}

/**
 * Returns the current Socket.IO server instance.
 * Returns null if not yet initialized.
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Returns a copy of the user socket map (for testing).
 */
export function getUserSocketMap(): Map<string, Set<string>> {
  return new Map(userSocketMap);
}

/**
 * Resets the WebSocket state (for testing).
 */
export function resetWebSocketState(): void {
  userSocketMap.clear();
  if (io) {
    io.close();
    io = null;
  }
}
