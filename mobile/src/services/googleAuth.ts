import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

const STORAGE_KEY_CLIENT_ID = 'trusttag_google_client_id';

// Default / fallback Google Client ID if configured via EXPO_PUBLIC_GOOGLE_CLIENT_ID
export function getSavedGoogleClientId(): string {
  if (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID && process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID.trim()) {
    return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID.trim();
  }
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_CLIENT_ID);
    if (saved && saved.trim()) return saved.trim();
  }
  return '';
}

export function saveGoogleClientId(clientId: string): void {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    if (clientId.trim()) {
      localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
    }
  }
}

// Ensure WebBrowser completes redirect on web
WebBrowser.maybeCompleteAuthSession();

let gsiScriptLoadingPromise: Promise<void> | null = null;

// Dynamically load Google Identity Services script on Web
export function loadGoogleGsiScript(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.resolve();
  }
  if ((window as any).google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  if (gsiScriptLoadingPromise) {
    return gsiScriptLoadingPromise;
  }

  gsiScriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-client') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (e) => reject(e));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => {
      gsiScriptLoadingPromise = null;
      reject(new Error('Google Web SDK yuklanmadi. Internet aloqasini tekshiring.'));
    };
    document.head.appendChild(script);
  });

  return gsiScriptLoadingPromise;
}

export interface GoogleAuthResult {
  idToken?: string;
  accessToken?: string;
  code?: string;
  mode: 'LOGIN' | 'SIGNUP';
}

/**
 * Trigger Real Google OAuth 2.0 flow across Web and Mobile
 */
export async function promptGoogleAuth(options: {
  clientId: string;
  mode: 'LOGIN' | 'SIGNUP';
}): Promise<GoogleAuthResult> {
  const { clientId, mode } = options;

  if (!clientId || !clientId.trim()) {
    throw new Error('Google Client ID topilmadi. Iltimos, Google Client ID ni kiriting.');
  }

  const cleanClientId = clientId.trim();

  // ==========================================
  // WEB PLATFORM: Google Identity Services (GIS)
  // ==========================================
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      await loadGoogleGsiScript();
    } catch (e) {
      console.warn('GIS script load error, falling back to OAuth2 popup', e);
    }

    // A) Try Google Identity Services Token Client if available
    if ((window as any).google?.accounts?.oauth2) {
      return new Promise<GoogleAuthResult>((resolve, reject) => {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: cleanClientId,
            scope: 'openid email profile',
            prompt: 'select_account',
            callback: (response: any) => {
              if (response?.error) {
                reject(new Error(response.error_description || response.error));
              } else if (response?.access_token) {
                resolve({
                  accessToken: response.access_token,
                  mode,
                });
              } else {
                reject(new Error('Google orqali token olinmadi. Qaytadan urinib ko\'ring.'));
              }
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Google tizimiga kirish bekor qilindi'));
            },
          });

          client.requestAccessToken({ prompt: 'select_account' });
        } catch (err) {
          reject(err);
        }
      });
    }

    // B) Direct Web Popup Fallback
    return new Promise<GoogleAuthResult>((resolve, reject) => {
      const redirectUri = window.location.origin;
      const state = `google_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const nonce = Math.random().toString(36).substring(2, 10);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        cleanClientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token%20id_token&scope=${encodeURIComponent(
        'openid email profile'
      )}&prompt=select_account&state=${encodeURIComponent(state)}&nonce=${nonce}`;

      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
      );

      if (!popup) {
        return reject(new Error('Brauzer oynasi (popup) bloklandi. Iltimos, popup oynalarga ruxsat bering.'));
      }

      const timer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer);
            return reject(new Error('Google tizimiga kirish oynasi yopildi'));
          }

          const currentUrl = popup.location.href;
          if (currentUrl && currentUrl.startsWith(redirectUri)) {
            const hash = popup.location.hash || '';
            const search = popup.location.search || '';
            popup.close();
            clearInterval(timer);

            const params = new URLSearchParams(hash.replace(/^#/, search.replace(/^\?/, '')));
            const accessToken = params.get('access_token') || undefined;
            const idToken = params.get('id_token') || undefined;

            if (accessToken || idToken) {
              resolve({
                accessToken,
                idToken,
                mode,
              });
            } else {
              reject(new Error('Google javobida token topilmadi'));
            }
          }
        } catch (e) {
          // Cross-origin checks during redirect are expected
        }
      }, 500);
    });
  }

  // ==========================================
  // MOBILE PLATFORM: Expo AuthSession / WebBrowser
  // ==========================================
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'trusttag',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    cleanClientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=token%20id_token&scope=${encodeURIComponent(
    'openid email profile'
  )}&prompt=select_account&nonce=${Date.now()}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type === 'success' && result.url) {
    const url = result.url;
    const hash = url.includes('#') ? url.substring(url.indexOf('#') + 1) : '';
    const query = url.includes('?') ? url.substring(url.indexOf('?') + 1).split('#')[0] : '';
    const params = new URLSearchParams(hash || query);

    const accessToken = params.get('access_token') || undefined;
    const idToken = params.get('id_token') || undefined;

    if (accessToken || idToken) {
      return {
        accessToken,
        idToken,
        mode,
      };
    }
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google tizimiga kirish bekor qilindi');
  }

  throw new Error('Google orqali autentifikatsiya yakunlanmadi');
}
