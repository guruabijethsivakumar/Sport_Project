import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlayMatchSocket, queryKeys } from '@playmatch/shared';
import { NotificationBell } from '../notifications/NotificationBell';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { useAuth } from '../../auth/AuthContext';

/**
 * Named slot in the Navbar reserved for Dev 3's real-time notification bell and drawer.
 * Connects the real-time Socket.IO client when authenticated to update badges and invalidate queries instantly.
 */
export function NavbarNotificationSlot(): React.ReactElement | null {
  const { isAuthenticated, client } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const socketRef = useRef<PlayMatchSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    // Retrieve active access token from the client adapter
    Promise.resolve(client.getAdapter().getAccessToken()).then((token) => {
      if (!isSubscribed || !token) return;

      const socket = new PlayMatchSocket({
        baseUrl: window.location.origin, // Proxied by Vite to backend /socket.io in dev, or origin in prod
        accessToken: token,
      });

      socket.connect();
      socketRef.current = socket;

      // Realtime notification arrived -> invalidate notifications list & unread count
      socket.on('notification.received', () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
      });

      // Realtime game update -> invalidate game queries & notifications
      socket.on('game.updated', (payload) => {
        if (payload?.gameId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(payload.gameId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.features.gameResult(payload.gameId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.features.teamSuggestion(payload.gameId) });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.features.notifications() });
      });
    });

    return () => {
      isSubscribed = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, client, queryClient]);

  if (!isAuthenticated) return null;

  return (
    <>
      <NotificationBell isOpen={isOpen} onClick={() => setIsOpen((prev) => !prev)} />
      <NotificationDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
