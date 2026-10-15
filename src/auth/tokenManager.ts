/**
 * @module auth/tokenManager
 * @description Secure JWT token storage, validation, and automatic refresh.
 *
 * Platform behavior:
 * - **Native (iOS/Android)**: Uses Expo SecureStore for encrypted storage.
 * - **Web**: Uses in-memory storage with sessionStorage fallback.
 *   httpOnly cookies should be set by the backend; the client never stores
 *   access tokens in localStorage to prevent XSS exfiltration.
 *
 * Token lifecycle:
 * 1. Login → store access + refresh tokens
 * 2. API request → attach access token via `getAccessToken()`
 * 3. Access token expired → call `refreshTokens()` with refresh token
 * 4. Refresh token expired → force re-login
 * 5. Logout → clear all tokens
 *
 * Architecture note: This module does NOT import from or modify any existing
 * domain, storage, or state module. It is consumed by AuthProvider.tsx.
 */

import { TOKEN_POLICY } from '../config/constants';
import { AuthTokens, DecodedToken } from './types';

// ---------------------------------------------------------------------------
// In-memory token store (never persisted to localStorage on web)
// ---------------------------------------------------------------------------

let _tokens: AuthTokens | null = null;
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Platform-adaptive secure storage
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'iridai_access_token',
  REFRESH_TOKEN: 'iridai_refresh_token',
  TOKEN_EXPIRY: 'iridai_token_expiry',
} as const;

/**
 * Attempts to use Expo SecureStore on native platforms.
 * Falls back to sessionStorage on web (cleared when tab closes).
 */
async function secureSet(key: string, value: string): Promise<void> {
  try {
    // Dynamic import to avoid bundling SecureStore on web
    const SecureStore = await import('expo-secure-store').catch(() => null);
    if (SecureStore) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {
    // Not available on this platform
  }
  // Web fallback: sessionStorage (not localStorage — closes with tab)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store').catch(() => null);
    if (SecureStore) {
      return await SecureStore.getItemAsync(key);
    }
  } catch {
    // Not available
  }
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(key);
  }
  return null;
}

async function secureDelete(key: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store').catch(() => null);
    if (SecureStore) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch {
    // Not available
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(key);
  }
}

// ---------------------------------------------------------------------------
// JWT decoding (without verification — verification happens server-side)
// ---------------------------------------------------------------------------

/**
 * Decodes a JWT payload without verifying the signature.
 * Signature verification MUST happen on the backend.
 *
 * @param token - Raw JWT string
 * @returns Decoded payload or null if malformed
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64url decode the payload
    const payload = parts[1]!;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = typeof atob !== 'undefined'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8');

    return JSON.parse(decoded) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Checks if a token is expired (with a configurable buffer).
 *
 * @param token - Decoded token payload
 * @param bufferMinutes - Minutes before actual expiry to consider it expired
 * @returns True if the token is expired or will expire within the buffer
 */
export function isTokenExpired(
  token: DecodedToken,
  bufferMinutes: number = TOKEN_POLICY.REFRESH_BUFFER_MINUTES,
): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return token.exp <= nowSeconds + bufferMinutes * 60;
}

// ---------------------------------------------------------------------------
// Token storage operations
// ---------------------------------------------------------------------------

/**
 * Stores authentication tokens securely.
 * Starts the automatic refresh timer.
 *
 * @param tokens - Access and refresh token pair from the auth API
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  _tokens = tokens;

  await Promise.all([
    secureSet(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    secureSet(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    secureSet(STORAGE_KEYS.TOKEN_EXPIRY, String(tokens.expiresAt)),
  ]);

  scheduleRefresh(tokens);
}

/**
 * Retrieves the current access token.
 * Returns null if no token is stored or if the token is expired.
 *
 * @returns The access token string or null
 */
export async function getAccessToken(): Promise<string | null> {
  if (_tokens) {
    const decoded = decodeToken(_tokens.accessToken);
    if (decoded && !isTokenExpired(decoded)) {
      return _tokens.accessToken;
    }
  }

  // Try recovering from secure storage (app restart scenario)
  const stored = await secureGet(STORAGE_KEYS.ACCESS_TOKEN);
  if (!stored) return null;

  const decoded = decodeToken(stored);
  if (!decoded || isTokenExpired(decoded)) {
    return null; // Caller should attempt a refresh
  }

  return stored;
}

/**
 * Retrieves the refresh token for session renewal.
 *
 * @returns The refresh token string or null
 */
export async function getRefreshToken(): Promise<string | null> {
  if (_tokens?.refreshToken) return _tokens.refreshToken;
  return secureGet(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Clears all stored tokens and cancels the refresh timer.
 * Called on logout or when the refresh token expires.
 */
export async function clearTokens(): Promise<void> {
  _tokens = null;
  cancelRefreshTimer();

  await Promise.all([
    secureDelete(STORAGE_KEYS.ACCESS_TOKEN),
    secureDelete(STORAGE_KEYS.REFRESH_TOKEN),
    secureDelete(STORAGE_KEYS.TOKEN_EXPIRY),
  ]);
}

/**
 * Checks if any tokens are stored (even if possibly expired).
 * Used for initial auth state hydration.
 */
export async function hasStoredTokens(): Promise<boolean> {
  if (_tokens) return true;
  const token = await secureGet(STORAGE_KEYS.ACCESS_TOKEN);
  return token !== null;
}

// ---------------------------------------------------------------------------
// Automatic refresh scheduling
// ---------------------------------------------------------------------------

let _refreshCallback: (() => Promise<void>) | null = null;

/**
 * Registers the callback to invoke when tokens need refreshing.
 * Typically set by AuthProvider on mount.
 */
export function setRefreshCallback(callback: () => Promise<void>): void {
  _refreshCallback = callback;
}

function cancelRefreshTimer(): void {
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

function scheduleRefresh(tokens: AuthTokens): void {
  cancelRefreshTimer();

  const nowMs = Date.now();
  const expiresMs = tokens.expiresAt * 1000;
  const bufferMs = TOKEN_POLICY.REFRESH_BUFFER_MINUTES * 60 * 1000;
  const refreshAt = expiresMs - bufferMs;
  const delay = Math.max(refreshAt - nowMs, 0);

  _refreshTimer = setTimeout(async () => {
    if (_refreshCallback) {
      try {
        await _refreshCallback();
      } catch {
        // Refresh failed — AuthProvider will handle the error state
      }
    }
  }, delay);
}
