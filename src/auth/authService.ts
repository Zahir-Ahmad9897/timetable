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

import { Platform } from 'react-native';
import { RATE_LIMITS } from '../config/constants';
import { getEnvironmentConfig } from '../config/environment';
import {
  AuthTokens,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from './types';
import { clearTokens, getAccessToken, getRefreshToken, storeTokens } from './tokenManager';


// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * API base URL for auth endpoints.
 * In production, this should be set to the actual backend URL.
 * During development, a mock implementation can be used.
 */
let _apiBaseUrl = getEnvironmentConfig().API_URL.replace(/\/+$/, '');

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

type WireAuthTokens = Omit<AuthTokens, 'expiresAt'> & {
  readonly expiresAt?: number;
  readonly expiresIn?: number;
};

type WireLoginResponse = Omit<LoginResponse, 'tokens'> & {
  readonly tokens: WireAuthTokens;
};

type WireRegisterResponse = Omit<RegisterResponse, 'tokens'> & {
  readonly tokens: WireAuthTokens;
};

function normalizeTokens(tokens: AuthTokens | WireAuthTokens): AuthTokens {
  const expiresAt = Number.isFinite(tokens.expiresAt)
    ? Number(tokens.expiresAt)
    : Math.floor(Date.now() / 1000) + Number((tokens as WireAuthTokens).expiresIn || 0);
  if (!tokens.accessToken || !tokens.refreshToken || expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new AuthError('The authentication server returned an invalid token response.', 502, 'INVALID_TOKEN_RESPONSE');
  }
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt,
    tokenType: 'Bearer',
  };
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
  if (!_apiBaseUrl && Platform.OS !== 'web') {
    throw new AuthError(
      'The mobile API URL is not configured. Set EXPO_PUBLIC_API_URL to the HTTPS backend origin.',
      503,
      'API_NOT_CONFIGURED',
    );
  }
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

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include', // Send cookies for httpOnly refresh tokens
    });
  } catch {
    throw new AuthError(
      `Cannot reach the authentication server at ${_apiBaseUrl || 'this site'}. Start the API server and try again.`,
      503,
      'API_UNREACHABLE',
    );
  }

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
    const response = await request<{ tokens: WireAuthTokens }>({
      method: 'POST',
      path: '/api/auth/refresh',
      body: { refreshToken },
      authenticated: false,
      skipRefresh: true,
    });
    await storeTokens(normalizeTokens(response.tokens));
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
  const response = await request<WireLoginResponse>({
    method: 'POST',
    path: '/api/auth/login',
    body: credentials,
    authenticated: false,
  });
  const tokens = normalizeTokens(response.tokens);
  await storeTokens(tokens);
  return { ...response, tokens };
}

/**
 * Creates a new user account.
 *
 * @throws {AuthError} On validation failure, duplicate email, or weak password
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await request<WireRegisterResponse>({
    method: 'POST',
    path: '/api/auth/register',
    body: data,
    authenticated: false,
  });
  const tokens = normalizeTokens(response.tokens);
  await storeTokens(tokens);
  return { ...response, tokens };
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
 * Retrieves the current user's profile.
 *
 * @throws {AuthError} On expired session
 */
export async function getProfile(): Promise<User> {
  return request<User>({
    method: 'GET',
    path: '/api/auth/profile',
  });
}

/** Creates the authenticated account's one and only organization membership. */
export async function enrollOrganization(organizationName: string): Promise<User> {
  return request<User>({
    method: 'POST',
    path: '/api/auth/enroll',
    body: { organizationName },
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

  const response = await request<{ tokens: WireAuthTokens }>({
    method: 'POST',
    path: '/api/auth/refresh',
    body: { refreshToken },
    authenticated: false,
    skipRefresh: true,
  });

  const tokens = normalizeTokens(response.tokens);
  await storeTokens(tokens);
  return tokens;
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
