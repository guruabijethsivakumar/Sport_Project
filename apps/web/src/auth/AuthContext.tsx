import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient, WebAuthAdapter } from '@playmatch/shared';
import { webClientConfig } from '../config';

interface AuthContextType {
  client: ApiClient;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  setUser: (user: any | null) => void;
  login: (data: { user: any; accessToken: string }) => void;
  logout: () => Promise<void>;
}

const authAdapter = new WebAuthAdapter();
export const sharedApiClient = new ApiClient(webClientConfig, authAdapter);

const AuthContext = createContext<AuthContextType | null>(null);

const LOGOUT_BROADCAST_CHANNEL = 'playmatch_auth_channel';
const LOGOUT_STORAGE_KEY = 'playmatch_logout_signal';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any | null>(null);

  // In-memory guard and session epoch to prevent any race condition or stale refresh
  const isLoggingOutRef = useRef<boolean>(false);
  const sessionEpochRef = useRef<number>(0);
  const hasLoggedOutInPageLifetimeRef = useRef<boolean>(false);

  const performLocalCleanup = useCallback(() => {
    sessionEpochRef.current += 1;
    authAdapter.clearSession();
    sharedApiClient.setLoggingOut(true);
    queryClient.clear();
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
  }, [queryClient]);

  const revalidateSession = useCallback(async () => {
    // If user has explicitly logged out during this page lifetime, never attempt background restore
    if (hasLoggedOutInPageLifetimeRef.current || isLoggingOutRef.current) {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
      return;
    }

    const currentEpoch = sessionEpochRef.current;
    try {
      await sharedApiClient.refreshSession();
      if (sessionEpochRef.current !== currentEpoch || isLoggingOutRef.current) {
        return;
      }
      try {
        const profileData: any = await sharedApiClient.get('/profile/me');
        if (sessionEpochRef.current === currentEpoch && !isLoggingOutRef.current) {
          const profileUser = profileData?.user || {};
          setUser((prev: any) => ({
            ...prev,
            ...profileData,
            ...profileUser,
            email: profileData?.email || profileUser?.email || prev?.email,
          }));
          setIsAuthenticated(true);
        }
      } catch {
        if (sessionEpochRef.current === currentEpoch && !isLoggingOutRef.current) {
          setIsAuthenticated(true);
        }
      }
    } catch {
      if (sessionEpochRef.current === currentEpoch) {
        performLocalCleanup();
      }
    } finally {
      setIsLoading(false);
    }
  }, [performLocalCleanup]);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial single-flight boot session restoration
    revalidateSession();

    // 2. ApiClient onLoggedOut event listener
    const unsubscribeClient = sharedApiClient.onLoggedOut(() => {
      if (isMounted) {
        performLocalCleanup();
      }
    });

    // 3. Multi-Tab Logout Synchronization (BroadcastChannel + storage fallback)
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel(LOGOUT_BROADCAST_CHANNEL);
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'LOGOUT') {
            hasLoggedOutInPageLifetimeRef.current = true;
            performLocalCleanup();
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOGOUT_STORAGE_KEY && event.newValue) {
        hasLoggedOutInPageLifetimeRef.current = true;
        performLocalCleanup();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Back/Forward Cache (bfcache) pageshow re-validation
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache: re-validate authentication status immediately
        if (hasLoggedOutInPageLifetimeRef.current || isLoggingOutRef.current) {
          performLocalCleanup();
        } else {
          revalidateSession();
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      isMounted = false;
      unsubscribeClient();
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [performLocalCleanup, revalidateSession]);

  const login = (data: { user: any; accessToken: string }) => {
    // Reset flags on successful login
    isLoggingOutRef.current = false;
    hasLoggedOutInPageLifetimeRef.current = false;
    sharedApiClient.setLoggingOut(false);
    sessionEpochRef.current += 1;

    // Clear any stale cached queries from prior user before setting new user
    queryClient.clear();
    authAdapter.setAccessToken(data.accessToken);
    setUser(data.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    isLoggingOutRef.current = true;
    hasLoggedOutInPageLifetimeRef.current = true;
    sharedApiClient.setLoggingOut(true);
    sessionEpochRef.current += 1;

    // Multi-tab logout signal dispatch (without secrets)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(LOGOUT_BROADCAST_CHANNEL);
        bc.postMessage({ type: 'LOGOUT', timestamp: Date.now() });
        bc.close();
      }
    } catch {
      // Ignore broadcast channel errors in restricted environments
    }

    try {
      localStorage.setItem(LOGOUT_STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignore storage errors in restricted environments
    }

    // Call backend logout endpoint to revoke session in DB and clear HttpOnly cookie
    try {
      await sharedApiClient.post('/auth/logout', {});
    } catch {
      // Offline or network error: proceed with local cleanup regardless
    } finally {
      performLocalCleanup();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        client: sharedApiClient,
        isAuthenticated,
        isLoading,
        user,
        setUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
