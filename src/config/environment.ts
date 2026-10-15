/**
 * @module environment
 * @description Typed runtime configuration loader with validation.
 *
 * Reads environment variables and provides a validated, frozen configuration
 * object. Missing required variables in production cause an immediate,
 * descriptive startup error rather than a silent runtime failure.
 *
 * Architecture note: This module sits in `src/config/` — a new layer that does
 * NOT modify any existing domain, storage, state, or screen module. Consumers
 * import `getConfig()` when they need server-side or build-time values.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppEnvironment {
  /** Current runtime environment */
  readonly nodeEnv: 'development' | 'production' | 'test';
  /** Semantic version of the application */
  readonly appVersion: string;
  /** Public base URL for absolute links and CORS origin */
  readonly appBaseUrl: string;
  /** URL path prefix for client-side routing */
  readonly appBasePath: string;

  // -- Authentication -------------------------------------------------------
  readonly auth: {
    readonly jwtSecret: string;
    readonly jwtIssuer: string;
    readonly jwtAudience: string;
    readonly accessTokenExpiryMinutes: number;
    readonly refreshTokenExpiryDays: number;
    readonly passwordMinLength: number;
    readonly maxLoginAttempts: number;
    readonly lockoutDurationMinutes: number;
  };

  // -- Subscription (Stripe) ------------------------------------------------
  readonly stripe: {
    readonly publishableKey: string;
  };

  // -- Security -------------------------------------------------------------
  readonly security: {
    readonly corsAllowedOrigins: string[];
    readonly rateLimitWindowMs: number;
    readonly rateLimitMaxRequests: number;
    readonly cspNoncePrefix: string;
  };

  // -- Server ---------------------------------------------------------------
  readonly server: {
    readonly port: number;
    readonly host: string;
  };

  // -- Logging --------------------------------------------------------------
  readonly logging: {
    readonly level: string;
    readonly sentryDsn: string;
    readonly auditEnabled: boolean;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function env(name: string, fallback?: string): string {
  const value = typeof process !== 'undefined' ? process.env[name] : undefined;
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  return '';
}

function envRequired(name: string): string {
  const value = env(name);
  if (!value && env('NODE_ENV') === 'production') {
    throw new Error(
      `[env] Required environment variable "${name}" is missing. ` +
      `Check .env.example for documentation.`
    );
  }
  return value;
}

function envInt(name: string, fallback: number): number {
  const raw = env(name);
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`[env] "${name}" must be an integer, got "${raw}".`);
  }
  return parsed;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = env(name).toLowerCase();
  if (!raw) return fallback;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _config: AppEnvironment | null = null;

/**
 * Builds and freezes the application configuration from environment variables.
 * Validates all required values in production mode.
 *
 * @returns Deeply frozen configuration object
 * @throws {Error} If a required variable is missing in production
 */
export function getConfig(): AppEnvironment {
  if (_config) return _config;

  const nodeEnv = (env('NODE_ENV', 'development') as AppEnvironment['nodeEnv']);

  _config = Object.freeze({
    nodeEnv,
    appVersion: env('APP_VERSION', '1.0.0'),
    appBaseUrl: env('APP_BASE_URL', 'http://localhost:3000'),
    appBasePath: env('APP_BASE_PATH', '/timetable'),

    auth: Object.freeze({
      jwtSecret: envRequired('AUTH_JWT_SECRET'),
      jwtIssuer: env('AUTH_JWT_ISSUER', 'iridai-timetable'),
      jwtAudience: env('AUTH_JWT_AUDIENCE', 'iridai-timetable-clients'),
      accessTokenExpiryMinutes: envInt('AUTH_ACCESS_TOKEN_EXPIRY_MINUTES', 15),
      refreshTokenExpiryDays: envInt('AUTH_REFRESH_TOKEN_EXPIRY_DAYS', 30),
      passwordMinLength: envInt('AUTH_PASSWORD_MIN_LENGTH', 12),
      maxLoginAttempts: envInt('AUTH_MAX_LOGIN_ATTEMPTS', 5),
      lockoutDurationMinutes: envInt('AUTH_LOCKOUT_DURATION_MINUTES', 15),
    }),

    stripe: Object.freeze({
      publishableKey: env('STRIPE_PUBLISHABLE_KEY', ''),
    }),

    security: Object.freeze({
      corsAllowedOrigins: env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',').map((s) => s.trim()),
      rateLimitWindowMs: envInt('RATE_LIMIT_WINDOW_MS', 900_000),
      rateLimitMaxRequests: envInt('RATE_LIMIT_MAX_REQUESTS', 100),
      cspNoncePrefix: env('CSP_NONCE_PREFIX', 'iridai'),
    }),

    server: Object.freeze({
      port: envInt('PORT', 3000),
      host: env('HOST', '0.0.0.0'),
    }),

    logging: Object.freeze({
      level: env('LOG_LEVEL', 'info'),
      sentryDsn: env('SENTRY_DSN', ''),
      auditEnabled: envBool('AUDIT_LOG_ENABLED', true),
    }),
  });

  return _config;
}

/**
 * Returns environment configuration with API_URL alias for compatibility.
 */
export function getEnvironmentConfig(): AppEnvironment & { API_URL: string } {
  const cfg = getConfig();
  return {
    ...cfg,
    API_URL: cfg.appBaseUrl,
  };
}

/**
 * Resets the cached config. Used only in testing.
 */
export function resetConfig(): void {
  _config = null;
}
