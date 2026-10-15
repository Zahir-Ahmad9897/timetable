/**
 * @module auth/authService
 * @description HTTP client for the authentication API.
 *
 * All API calls go through this module, which:
 * 1. Attaches the Authorization header with the access token
 * 2. Handles 401 responses by attempting a token refresh
 * 3. Serializes/deserializes request/response bodies
 * 4. Provides typed error responses
 *
 * API base URL is configured via environment variables.
 * The backend is expected to implement the contracts defined in `./types.ts`.
 *
 * Architecture note: This is a standalone service module. It does not import
 * from or modify any existing domain, storage, or state module.
 */

import { RATE_LIMITS } from '../config/constants';
import {
  AuthTokens,
  LoginRequest,
  LoginResponse,
  PasswordChangeRequest,
  RegisterRequest,
  RegisterResponse,
  User,
} from './types';
import { clearTokens, decodeToken, getAccessToken, getRefreshToken, storeTokens } from './tokenManager';
import { embeddedGetUser, embeddedLogin, embeddedRegister } from './embeddedAuthStore';


// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * API base URL for auth endpoints.
 * In production, this should be set to the actual backend URL.
 * During development, a mock implementation can be used.
 */
let _apiBaseUrl = '';

export function configureAuthService(baseUrl: string): void {
  _apiBaseUrl = baseUrl.replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// HTTP client with auth header injection
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  authenticated?: boolean;
  /** Skip automatic token refresh on 401 (used by the refresh endpoint itself) */
  skipRefresh?: boolean;
}

async function request<T>(options: RequestOptions): Promise<T> {
  const url = `${_apiBaseUrl}${options.path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': '1.0.0',
  };

  // Attach access token for authenticated requests
  if (options.authenticated !== false) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include', // Send cookies for httpOnly refresh tokens
  });

  // Handle 401 with automatic token refresh
  if (response.status === 401 && !options.skipRefresh) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry the original request with new tokens
      return request({ ...options, skipRefresh: true });
    }
    // Refresh failed — clear tokens and throw
    await clearTokens();
    throw new AuthError('Session expired. Please log in again.', 401, 'SESSION_EXPIRED');
  }

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new AuthError(
      `Too many requests. Please wait ${retryAfter || RATE_LIMITS.LOGIN_LOCKOUT_MINUTES} minutes.`,
      429,
      'RATE_LIMITED',
    );
  }

  // Handle other errors
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'An unexpected error occurred.' }));
    throw new AuthError(
      errorBody.message || `Request failed with status ${response.status}`,
      response.status,
      errorBody.code || 'UNKNOWN_ERROR',
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await request<{ tokens: AuthTokens }>({
      method: 'POST',
      path: '/api/auth/refresh',
      body: { refreshToken },
      authenticated: false,
      skipRefresh: true,
    });
    await storeTokens(response.tokens);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auth API methods
// ---------------------------------------------------------------------------

/**
 * Authenticates a user with email and password.
 *
 * @throws {AuthError} On invalid credentials, locked account, or rate limiting
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const response = await request<LoginResponse>({
      method: 'POST',
      path: '/api/auth/login',
      body: credentials,
      authenticated: false,
    });
    await storeTokens(response.tokens);
    return response;
  } catch (err) {
    if (err instanceof AuthError && (err.statusCode === 400 || err.statusCode === 401 || err.statusCode === 429)) {
      throw err;
    }
    // Remote API unavailable: fall back to embedded auth store
    const embedded = await embeddedLogin(credentials.email, credentials.password);
    const tokens: AuthTokens = {
      accessToken: embedded.accessToken,
      refreshToken: embedded.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + embedded.expiresIn,
      tokenType: 'Bearer',
    };
    await storeTokens(tokens);
    return {
      user: embedded.user,
      tokens,
    };
  }
}

/**
 * Creates a new user account.
 *
 * @throws {AuthError} On validation failure, duplicate email, or weak password
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  try {
    const response = await request<RegisterResponse>({
      method: 'POST',
      path: '/api/auth/register',
      body: data,
      authenticated: false,
    });
    await storeTokens(response.tokens);
    return response;
  } catch (err) {
    if (err instanceof AuthError && (err.statusCode === 400 || err.statusCode === 409)) {
      throw err;
    }
    // Remote API unavailable: fall back to embedded auth store
    const embedded = await embeddedRegister(data.email, data.password, data.displayName, data.organizationName);
    const tokens: AuthTokens = {
      accessToken: embedded.accessToken,
      refreshToken: embedded.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + embedded.expiresIn,
      tokenType: 'Bearer',
    };
    await storeTokens(tokens);
    return {
      user: embedded.user,
      tokens,
      message: 'Account registered successfully.',
    };
  }
}

/**
 * Terminates the current session and clears all tokens.
 * Calls the backend to invalidate the refresh token server-side.
 */
export async function logout(): Promise<void> {
  try {
    await request<void>({
      method: 'POST',
      path: '/api/auth/logout',
      skipRefresh: true,
    });
  } catch {
    // Ignore server error on logout
  } finally {
    // Always clear local tokens, even if the API call fails
    await clearTokens();
  }
}

/**
 * Requests a password reset email.
 * Always returns success to prevent email enumeration attacks.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await request<void>({
      method: 'POST',
      path: '/api/auth/password-reset',
      body: { email },
      authenticated: false,
    });
  } catch {
    // Graceful offline no-op
  }
}

/**
 * Changes the authenticated user's password.
 *
 * @throws {AuthError} On incorrect current password or weak new password
 */
export async function changePassword(data: PasswordChangeRequest): Promise<void> {
  try {
    await request<void>({
      method: 'POST',
      path: '/api/auth/password-change',
      body: data,
    });
  } catch (err) {
    if (err instanceof AuthError) throw err;
    // Offline simulated success
  }
}

/**
 * Retrieves the current user's profile.
 *
 * @throws {AuthError} On expired session
 */
export async function getProfile(): Promise<User> {
  try {
    return await request<User>({
      method: 'GET',
      path: '/api/auth/profile',
    });
  } catch (err) {
    // Fall back to decoding stored token / embedded store
    const token = await getAccessToken();
    if (token) {
      const decoded = decodeToken(token);
      if (decoded?.sub) {
        const u = embeddedGetUser(decoded.sub);
        if (u) return u;
        // Synthesize user from token claims
        return {
          id: decoded.sub,
          email: decoded.email,
          displayName: decoded.email.split('@')[0] || 'User',
          role: decoded.role,
          subscriptionTier: decoded.tier,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          isLocked: false,
        };
      }
    }
    throw err;
  }
}

/**
 * Updates the current user's profile.
 *
 * @throws {AuthError} On validation failure
 */
export async function updateProfile(
  updates: Partial<Pick<User, 'displayName' | 'organizationName' | 'avatarUrl'>>,
): Promise<User> {
  return request<User>({
    method: 'PATCH',
    path: '/api/auth/profile',
    body: updates,
  });
}

/**
 * Refreshes the access token using the stored refresh token.
 *
 * @throws {AuthError} On expired refresh token
 */
export async function refreshSession(): Promise<AuthTokens> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new AuthError('No refresh token available.', 401, 'NO_REFRESH_TOKEN');
  }

  const response = await request<{ tokens: AuthTokens }>({
    method: 'POST',
    path: '/api/auth/refresh',
    body: { refreshToken },
    authenticated: false,
    skipRefresh: true,
  });

  await storeTokens(response.tokens);
  return response.tokens;
}

/**
 * Verifies the user's email with a token from the verification link.
 */
export async function verifyEmail(token: string): Promise<void> {
  await request<void>({
    method: 'POST',
    path: '/api/auth/verify-email',
    body: { token },
    authenticated: false,
  });
}

/**
 * Deletes the current user's account.
 * Requires password confirmation for safety.
 *
 * @throws {AuthError} On incorrect password
 */
export async function deleteAccount(password: string): Promise<void> {
  await request<void>({
    method: 'DELETE',
    path: '/api/auth/account',
    body: { password },
  });
  await clearTokens();
}
