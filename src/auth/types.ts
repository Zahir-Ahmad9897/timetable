/**
 * @module auth/types
 * @description Type definitions for the authentication and authorization system.
 *
 * These types define the contracts between the auth client, the API backend,
 * and the React UI layer. They are intentionally independent of the existing
 * domain types to maintain separation of concerns.
 *
 * Architecture note: Auth types live in `src/auth/` — a new module that wraps
 * around the existing app without modifying domain, storage, or screen files.
 */

import { SUBSCRIPTION_TIERS } from '../config/constants';

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

export interface User {
  /** Unique user identifier (UUID v4) */
  readonly id: string;
  /** User's email address (verified) */
  readonly email: string;
  /** User's display name */
  readonly displayName: string;
  /** Organization name (optional, used for Enterprise tier branding) */
  readonly organizationName?: string;
  /** User's role within the system */
  readonly role: UserRole;
  /** Current subscription tier */
  readonly subscriptionTier: SubscriptionTier;
  /** Whether the user's email has been verified */
  readonly emailVerified: boolean;
  /** Account creation timestamp (ISO 8601) */
  readonly createdAt: string;
  /** Last login timestamp (ISO 8601) */
  readonly lastLoginAt?: string;
  /** Account locked status */
  readonly isLocked: boolean;
  /** Profile image URL (optional) */
  readonly avatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type UserRole = 'viewer' | 'editor' | 'admin' | 'super_admin';

/**
 * Role hierarchy: super_admin > admin > editor > viewer.
 * Higher roles inherit all permissions of lower roles.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

// ---------------------------------------------------------------------------
// Authentication tokens
// ---------------------------------------------------------------------------

export interface AuthTokens {
  /** Short-lived access token for API requests */
  readonly accessToken: string;
  /** Long-lived refresh token for obtaining new access tokens */
  readonly refreshToken: string;
  /** Access token expiry timestamp (Unix epoch seconds) */
  readonly expiresAt: number;
  /** Token type (always "Bearer") */
  readonly tokenType: 'Bearer';
}

export interface DecodedToken {
  /** Subject — the user ID */
  readonly sub: string;
  /** User's email */
  readonly email: string;
  /** User's role */
  readonly role: UserRole;
  /** Subscription tier */
  readonly tier: SubscriptionTier;
  /** Issued at (Unix epoch seconds) */
  readonly iat: number;
  /** Expiration (Unix epoch seconds) */
  readonly exp: number;
  /** Issuer */
  readonly iss: string;
  /** Audience */
  readonly aud: string;
  /** Session ID for concurrent session management */
  readonly sid: string;
}

// ---------------------------------------------------------------------------
// Auth API contracts
// ---------------------------------------------------------------------------

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  /** Client fingerprint for device tracking */
  readonly deviceFingerprint?: string;
}

export interface LoginResponse {
  readonly user: User;
  readonly tokens: AuthTokens;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly organizationName?: string;
}

export interface RegisterResponse {
  readonly user: User;
  readonly tokens: AuthTokens;
  readonly message: string;
}

export interface PasswordResetRequest {
  readonly email: string;
}

export interface PasswordChangeRequest {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface RefreshTokenRequest {
  readonly refreshToken: string;
}

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

export type AuthStatus =
  | 'idle'
  | 'authenticating'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export interface AuthState {
  readonly status: AuthStatus;
  readonly user: User | null;
  readonly tokens: AuthTokens | null;
  readonly error: string | null;
}

// ---------------------------------------------------------------------------
// Auth context interface (consumed by React components)
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  readonly state: AuthState;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly user: User | null;

  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  changePassword: (request: PasswordChangeRequest) => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'displayName' | 'organizationName' | 'avatarUrl'>>) => Promise<void>;
}
