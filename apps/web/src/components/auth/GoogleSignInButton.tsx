import React, { useEffect, useRef, useState } from 'react';
import { AUTH_MESSAGES } from '@playmatch/shared';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
            }
          ) => void;
        };
      };
    };
  }
}

export interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void | Promise<void>;
  onError?: (err: Error) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  clientId?: string;
  disabled?: boolean;
}

const GIS_SCRIPT_ID = 'google-identity-services-script';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'continue_with',
  clientId: propClientId,
  disabled = false,
}: GoogleSignInButtonProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const googleClientId = (
    propClientId !== undefined
      ? propClientId
      : (import.meta.env.VITE_GOOGLE_CLIENT_ID ? String(import.meta.env.VITE_GOOGLE_CLIENT_ID).trim() : '')
  ).trim();

  // If no client ID configured, hide button completely per requirements
  if (!googleClientId) {
    return null;
  }

  useEffect(() => {
    // If google script or mock already available on window, activate immediately
    if (window.google?.accounts?.id) {
      setIsScriptLoaded(true);
      return;
    }

    // Check if script element is already in DOM
    const existingScript = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = GIS_SCRIPT_ID;
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        // Silently fail without console crash if network blocked
        onError?.(new Error('Failed to load Google Identity Services'));
      };
      document.body.appendChild(script);
    } else {
      const handleLoad = () => setIsScriptLoaded(true);
      existingScript.addEventListener('load', handleLoad);
      return () => existingScript.removeEventListener('load', handleLoad);
    }
  }, [onError]);

  useEffect(() => {
    if (!isScriptLoaded || !window.google?.accounts?.id || !containerRef.current || disabled) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential: string }) => {
          if (response?.credential) {
            onSuccess(response.credential);
          }
        },
      });

      // Clear any prior rendered button to prevent duplicate DOM
      containerRef.current.innerHTML = '';

      const isDarkMode = document.documentElement.classList.contains('dark');
      const theme = isDarkMode ? 'filled_black' : 'outline';

      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme,
        size: 'large',
        text,
        shape: 'rectangular',
        width: '100%',
      });
    } catch (e: any) {
      onError?.(e);
    }
  }, [isScriptLoaded, googleClientId, onSuccess, onError, text, disabled]);

  return (
    <div className="w-full space-y-3" data-testid="google-signin-wrapper">
      <div
        ref={containerRef}
        className="w-full min-h-[44px] flex items-center justify-center overflow-hidden rounded-md"
        data-testid="google-signin-button-container"
      />
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-border-subtle" />
        <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase">
          {AUTH_MESSAGES.orDividerText}
        </span>
        <div className="flex-grow border-t border-border-subtle" />
      </div>
    </div>
  );
}
