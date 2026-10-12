import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { ApiClient, WebAuthAdapter } from '@playmatch/shared';
import { webClientConfig } from '../config';
const authAdapter = new WebAuthAdapter();
export const sharedApiClient = new ApiClient(webClientConfig, authAdapter);
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    useEffect(() => {
        let isMounted = true;
        // Single-flight session restore on boot
        sharedApiClient
            .refreshSession()
            .then(async () => {
            if (!isMounted)
                return;
            try {
                const profile = await sharedApiClient.get('/profile/me');
                if (isMounted) {
                    setUser(profile);
                    setIsAuthenticated(true);
                }
            }
            catch {
                if (isMounted) {
                    setIsAuthenticated(true);
                }
            }
        })
            .catch(() => {
            if (isMounted) {
                setIsAuthenticated(false);
                setUser(null);
            }
        })
            .finally(() => {
            if (isMounted) {
                setIsLoading(false);
            }
        });
        const unsubscribe = sharedApiClient.onLoggedOut(() => {
            if (isMounted) {
                setIsAuthenticated(false);
                setUser(null);
            }
        });
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);
    const logout = async () => {
        try {
            await sharedApiClient.post('/auth/logout', {});
        }
        finally {
            authAdapter.clearSession();
            setIsAuthenticated(false);
            setUser(null);
        }
    };
    return (_jsx(AuthContext.Provider, { value: {
            client: sharedApiClient,
            isAuthenticated,
            isLoading,
            user,
            setUser,
            logout,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
