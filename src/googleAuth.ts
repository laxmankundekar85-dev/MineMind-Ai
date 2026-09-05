import { registerPlugin } from '@capacitor/core';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (momentListener?: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: any) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
          initCodeClient?: (config: any) => any;
        };
      };
    };
  }
}

export interface GoogleUserProfile {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  email: string;
  email_verified?: boolean;
  picture?: string;
}

// Current runtime container URLs for Google Console configuration
export const GOOGLE_CONSOLE_CONFIG = {
  devUrl: 'https://ais-dev-4rfgbivmvuoe4c4sn5iq5d-205116143886.asia-southeast1.run.app',
  sharedUrl: 'https://ais-pre-4rfgbivmvuoe4c4sn5iq5d-205116143886.asia-southeast1.run.app',
  localUrl: 'http://localhost:3000',
  consoleUrl: 'https://console.cloud.google.com/apis/credentials',
};

/**
 * Retrieve the active Google Client ID from environment, localStorage, or server config
 */
export function getSavedGoogleClientId(): string {
  // 1. Check Vite env variable
  const viteClientId = 
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
    '';
  if (viteClientId && viteClientId.trim()) return viteClientId.trim();

  // 2. Check localStorage
  if (typeof window !== 'undefined') {
    const localId = localStorage.getItem('minemind_google_client_id');
    if (localId && localId.trim()) return localId.trim();
  }

  return '';
}

/**
 * Persist user-provided Google Client ID
 */
export function saveGoogleClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    if (clientId.trim()) {
      localStorage.setItem('minemind_google_client_id', clientId.trim());
    } else {
      localStorage.removeItem('minemind_google_client_id');
    }
  }
}

/**
 * Fetch Google Client ID from backend server if available
 */
export async function fetchServerGoogleConfig(): Promise<string> {
  try {
    const res = await fetch('/api/auth/google/config');
    if (res.ok) {
      const data = await res.json();
      if (data.clientId) {
        return data.clientId;
      }
    }
  } catch (err) {
    console.debug('[Google Auth] Notice checking server config:', err);
  }
  return '';
}

/**
 * Check if the Google Identity Services SDK is loaded in the browser
 */
export function isGoogleGsiLoaded(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.accounts?.oauth2);
}

/**
 * Trigger official Google OAuth popup using Google Identity Services token client
 */
export function promptGoogleLoginDirect(clientId: string): Promise<GoogleUserProfile> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services SDK is still loading. Please try again in a moment.'));
    }

    if (!clientId || !clientId.trim()) {
      return reject(new Error('Google Client ID is missing. Please configure your OAuth Client ID from Google Cloud Console.'));
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            const errDescription = tokenResponse.error_description || tokenResponse.error || 'Google authorization was cancelled or denied.';
            const isDismissed = 
              tokenResponse.error === 'access_denied' || 
              tokenResponse.error === 'popup_closed' || 
              String(errDescription).toLowerCase().includes('closed') ||
              String(errDescription).toLowerCase().includes('cancel');

            if (isDismissed) {
              console.debug('[Google Auth] Notice:', errDescription);
            } else {
              console.warn('[Google Auth] OAuth notice:', errDescription);
            }
            return reject(new Error(errDescription));
          }

          if (!tokenResponse.access_token) {
            return reject(new Error('No access token received from Google OAuth response.'));
          }

          try {
            // Fetch verified user profile from Google UserInfo endpoint
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            });

            if (!userInfoRes.ok) {
              const errBody = await userInfoRes.text();
              throw new Error(`Failed to retrieve profile from Google: ${errBody}`);
            }

            const profile: GoogleUserProfile = await userInfoRes.json();
            resolve(profile);
          } catch (fetchErr: any) {
            reject(new Error(fetchErr.message || 'Error fetching user profile from Google.'));
          }
        },
        error_callback: (err: any) => {
          const rawMessage = typeof err === 'string' 
            ? err 
            : (err?.message || err?.type || 'Google OAuth prompt was closed or cancelled.');
          
          const isClosedOrCancelled = 
            err?.type === 'popup_closed' ||
            String(rawMessage).toLowerCase().includes('popup') ||
            String(rawMessage).toLowerCase().includes('closed') ||
            String(rawMessage).toLowerCase().includes('cancel');

          if (isClosedOrCancelled) {
            console.debug('[Google Auth] Popup window closed by user.');
            return reject(new Error('Google sign-in popup was closed before completion.'));
          }

          console.warn('[Google Auth] Token client notice:', rawMessage);
          reject(new Error(rawMessage));
        },
      });

      tokenClient.requestAccessToken();
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Disables Google Auto-Select so the user is prompted to pick an account next time
 */
export function disableGoogleAutoSelect(): void {
  try {
    if (typeof window !== 'undefined') {
      if (window.google?.accounts?.id?.disableAutoSelect) {
        window.google.accounts.id.disableAutoSelect();
      }
    }
  } catch (err) {
    console.debug('[Google Auth] disableAutoSelect notice:', err);
  }
}

/**
 * Native Android Google Account Chooser via Capacitor Bridge
 */
export interface NativeGoogleAuthPlugin {
  chooseAccount(): Promise<{ email: string }>;
}

export const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPlugin>('NativeGoogleAuth');

export async function promptNativeGoogleAccount(): Promise<{ email: string }> {
  return await NativeGoogleAuth.chooseAccount();
}
