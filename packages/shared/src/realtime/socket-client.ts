import { io, type Socket } from 'socket.io-client';

// ─── Event payload types ────────────────────────────────────────────────────

export interface NotificationReceivedPayload {
  id: string;
  userId: string;
  type:
    | 'game_invitation'
    | 'game_confirmed'
    | 'game_cancelled'
    | 'result_submitted'
    | 'rating_updated';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface GameUpdatedPayload {
  gameId: string;
  status: string;
  updatedAt: string;
  /** Optional detail about what changed (e.g. 'roster_changed', 'result_submitted'). */
  changeType?: string;
}

// ─── Typed event maps ───────────────────────────────────────────────────────

/** Events the server emits TO the client. */
export interface ServerToClientEvents {
  'notification.received': (payload: NotificationReceivedPayload) => void;
  'game.updated': (payload: GameUpdatedPayload) => void;
}

/** Events the client emits TO the server (none needed yet). */
export type ClientToServerEvents = Record<string, never>;

// ─── Configuration ──────────────────────────────────────────────────────────

export interface PlayMatchSocketConfig {
  /** Base URL of the backend (e.g. "http://localhost:5000"). */
  baseUrl?: string;
  /** JWT access token for socket authentication. */
  accessToken?: string;
}

// ─── Client class ───────────────────────────────────────────────────────────

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type EventName = keyof ServerToClientEvents;
type EventHandler<E extends EventName> = ServerToClientEvents[E];

/**
 * Strongly-typed Socket.IO client for PlayMatch real-time events.
 *
 * Usage:
 * ```ts
 * const socket = new PlayMatchSocket({
 *   baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
 *   accessToken: token,
 * });
 * socket.connect();
 * socket.on('notification.received', (n) => console.log(n));
 * ```
 */
export class PlayMatchSocket {
  private socket: TypedSocket | null = null;
  private config: Required<Pick<PlayMatchSocketConfig, 'baseUrl'>> & PlayMatchSocketConfig;

  constructor(config: PlayMatchSocketConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:5000',
      ...config,
    };
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Open the WebSocket connection. Safe to call multiple times. */
  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.config.baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: this.config.accessToken
        ? { token: this.config.accessToken }
        : undefined,
    }) as TypedSocket;
  }

  /** Gracefully disconnect. */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /** Whether the socket is currently connected. */
  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Auth token update ────────────────────────────────────────────────────

  /** Update the auth token (e.g. after a token refresh) and reconnect. */
  updateToken(accessToken: string): void {
    this.config.accessToken = accessToken;
    if (this.socket) {
      (this.socket.auth as Record<string, unknown>) = { token: accessToken };
      this.socket.disconnect().connect();
    }
  }

  // ── Typed event listeners ────────────────────────────────────────────────

  /** Subscribe to a server event. Returns an unsubscribe function. */
  on<E extends EventName>(event: E, handler: EventHandler<E>): () => void {
    if (!this.socket) {
      throw new Error(
        'PlayMatchSocket: call connect() before subscribing to events.',
      );
    }
    this.socket.on(event, handler as any);
    return () => {
      this.socket?.off(event, handler as any);
    };
  }

  /** Subscribe to a server event once. */
  once<E extends EventName>(event: E, handler: EventHandler<E>): void {
    if (!this.socket) {
      throw new Error(
        'PlayMatchSocket: call connect() before subscribing to events.',
      );
    }
    this.socket.once(event, handler as any);
  }

  /** Unsubscribe a specific handler or all handlers for an event. */
  off<E extends EventName>(event: E, handler?: EventHandler<E>): void {
    if (!this.socket) return;
    if (handler) {
      this.socket.off(event, handler as any);
    } else {
      this.socket.removeAllListeners(event);
    }
  }

  // ── Connection lifecycle events ──────────────────────────────────────────

  /** Listen to raw Socket.IO lifecycle events (connect, disconnect, error). */
  onConnect(handler: () => void): () => void {
    this.socket?.on('connect', handler);
    return () => {
      this.socket?.off('connect', handler);
    };
  }

  onDisconnect(handler: (reason: string) => void): () => void {
    this.socket?.on('disconnect', handler);
    return () => {
      this.socket?.off('disconnect', handler);
    };
  }

  onConnectError(handler: (err: Error) => void): () => void {
    this.socket?.on('connect_error', handler);
    return () => {
      this.socket?.off('connect_error', handler);
    };
  }
}
