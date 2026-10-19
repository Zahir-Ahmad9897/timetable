/**
 * @module constants
 * @description Security and business constants for the irid.ai Timetable SaaS platform.
 *
 * All magic numbers and policy values are centralized here to prevent scattered
 * hardcoded values and to make security audits straightforward.
 *
 * Architecture note: This module is imported by auth, subscription, and security
 * modules. It does NOT depend on any existing domain/storage/state module.
 */

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------

export const PASSWORD_POLICY = Object.freeze({
  /** Minimum password length (NIST SP 800-63B recommends >= 8, we enforce 12) */
  MIN_LENGTH: 12,
  /** Maximum password length to prevent DoS via bcrypt */
  MAX_LENGTH: 128,
  /** Require at least one uppercase letter */
  REQUIRE_UPPERCASE: true,
  /** Require at least one lowercase letter */
  REQUIRE_LOWERCASE: true,
  /** Require at least one digit */
  REQUIRE_DIGIT: true,
  /** Require at least one special character */
  REQUIRE_SPECIAL: true,
  /** Special characters accepted */
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  /** Number of previous passwords to check for reuse prevention */
  HISTORY_COUNT: 5,
});

// ---------------------------------------------------------------------------
// Session & token policy
// ---------------------------------------------------------------------------

export const TOKEN_POLICY = Object.freeze({
  /** Access token lifetime in minutes */
  ACCESS_TOKEN_EXPIRY_MINUTES: 15,
  /** Refresh token lifetime in days */
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
  /** How many minutes before expiry to proactively refresh */
  REFRESH_BUFFER_MINUTES: 2,
  /** Maximum concurrent sessions per user */
  MAX_CONCURRENT_SESSIONS: 5,
  /** Token type identifier for Authorization header */
  TOKEN_TYPE: 'Bearer' as const,
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export const RATE_LIMITS = Object.freeze({
  /** Login attempts before lockout */
  LOGIN_MAX_ATTEMPTS: 5,
  /** Lockout duration in minutes after exceeding login attempts */
  LOGIN_LOCKOUT_MINUTES: 15,
  /** General API rate limit window in milliseconds (15 minutes) */
  WINDOW_MS: 15 * 60 * 1000,
  /** Maximum requests per window for authenticated users */
  AUTH_MAX_REQUESTS: 200,
  /** Maximum requests per window for unauthenticated users */
  ANON_MAX_REQUESTS: 50,
  /** Maximum requests per window for subscription management */
  BILLING_MAX_REQUESTS: 20,
  /** Maximum file upload size in bytes (10 MB) */
  MAX_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024,
  /** Maximum JSON body size in bytes (1 MB) */
  MAX_BODY_SIZE_BYTES: 1 * 1024 * 1024,
});

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

export const SECURITY_HEADERS = Object.freeze({
  /** Strict-Transport-Security max-age in seconds (2 years) */
  HSTS_MAX_AGE: 63_072_000,
  /** Content-Security-Policy directives (configured per deployment) */
  CSP_REPORT_URI: '/api/csp-report',
  /** Feature-Policy / Permissions-Policy restrictions */
  PERMISSIONS_POLICY: 'camera=(), microphone=(), geolocation=(), payment=(self)',
});

// ---------------------------------------------------------------------------
// Data leakage prevention
// ---------------------------------------------------------------------------

export const DLP_POLICY = Object.freeze({
  /** Maximum workspace export size in bytes (50 MB) */
  MAX_EXPORT_SIZE_BYTES: 50 * 1024 * 1024,
  /** Maximum records per workspace (per existing validation.ts limits) */
  MAX_RECORDS: Object.freeze({
    departments: 50,
    semesters: 700,
    sections: 1400,
    courses: 3000,
    teachers: 2000,
    assignments: 10000,
    rooms: 2000,
  }),
  /** Sensitive field patterns to sanitize from logs */
  SENSITIVE_FIELD_PATTERNS: [
    /password/i, /secret/i, /token/i, /key/i, /auth/i,
    /credit.?card/i, /ssn/i, /social.?security/i,
  ],
  /** File types allowed for import */
  ALLOWED_IMPORT_TYPES: ['.json', '.xlsx'],
  /** Maximum import file size in bytes (10 MB) */
  MAX_IMPORT_SIZE_BYTES: 10 * 1024 * 1024,
});

// ---------------------------------------------------------------------------
// Subscription tiers
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_TIERS = Object.freeze({
  FREE: 'free' as const,
  PRO: 'pro' as const,
  ENTERPRISE: 'enterprise' as const,
});

export const TIER_LIMITS = Object.freeze({
  free: Object.freeze({
    maxWorkspaces: 1,
    maxDepartments: 5,
    maxSemestersPerDepartment: 8,
    maxSectionsPerSemester: 2,
    maxCourses: 100,
    maxTeachers: 100,
    maxRooms: 100,
    maxAssignments: 200,
    maxGenerationsTotal: 5,
    maxGenerationsPerDay: 5,
    excelExport: false,
    academicImport: true,
    prioritySupport: false,
    ssoEnabled: false,
    auditLog: false,
    customBranding: false,
    apiAccess: false,
  }),
  pro: Object.freeze({
    maxWorkspaces: 10,
    maxDepartments: 20,
    maxSemestersPerDepartment: 14,
    maxSectionsPerSemester: 10,
    maxCourses: 1000,
    maxTeachers: 200,
    maxRooms: 100,
    maxAssignments: 2000,
    maxGenerationsTotal: -1,
    maxGenerationsPerDay: 100,
    excelExport: true,
    academicImport: true,
    prioritySupport: false,
    ssoEnabled: false,
    auditLog: false,
    customBranding: false,
    apiAccess: true,
  }),
  enterprise: Object.freeze({
    maxWorkspaces: -1, // unlimited
    maxDepartments: -1,
    maxSemestersPerDepartment: -1,
    maxSectionsPerSemester: -1,
    maxCourses: -1,
    maxTeachers: -1,
    maxRooms: -1,
    maxAssignments: -1,
    maxGenerationsTotal: -1,
    maxGenerationsPerDay: -1,
    excelExport: true,
    academicImport: true,
    prioritySupport: false,
    ssoEnabled: false,
    auditLog: false,
    customBranding: false,
    apiAccess: false,
  }),
});

// ---------------------------------------------------------------------------
// Audit event types
// ---------------------------------------------------------------------------

export const AUDIT_EVENTS = Object.freeze({
  // Authentication
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  TOKEN_REFRESH: 'auth.token.refresh',
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  ACCOUNT_LOCKED: 'auth.account.locked',
  ACCOUNT_CREATED: 'auth.account.created',

  // Data operations
  WORKSPACE_EXPORT: 'data.workspace.export',
  WORKSPACE_IMPORT: 'data.workspace.import',
  WORKSPACE_DELETE: 'data.workspace.delete',
  TIMETABLE_GENERATED: 'data.timetable.generated',
  TIMETABLE_EXPORTED: 'data.timetable.exported',

  // Subscription
  SUBSCRIPTION_CREATED: 'billing.subscription.created',
  SUBSCRIPTION_UPDATED: 'billing.subscription.updated',
  SUBSCRIPTION_CANCELLED: 'billing.subscription.cancelled',
  PAYMENT_SUCCESS: 'billing.payment.success',
  PAYMENT_FAILURE: 'billing.payment.failure',

  // Security
  RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',
  INVALID_TOKEN: 'security.token.invalid',
  UNAUTHORIZED_ACCESS: 'security.access.unauthorized',
  CSP_VIOLATION: 'security.csp.violation',
  SUSPICIOUS_INPUT: 'security.input.suspicious',
});
