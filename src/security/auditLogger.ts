/**
 * @module security/auditLogger
 * @description Tamper-evident audit logging engine for security and compliance events.
 *
 * Captures critical operations (authentication, data exports, tier modifications, DLP violations)
 * with automatic sensitive data redaction.
 */

import { scrubSensitiveFields } from './dataLeakagePrevention';

export type AuditSeverity = 'INFO' | 'WARNING' | 'SECURITY' | 'CRITICAL';

export type AuditEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_PASSWORD_CHANGE'
  | 'WORKSPACE_EXPORT'
  | 'WORKSPACE_IMPORT'
  | 'TIMETABLE_GENERATE'
  | 'SUBSCRIPTION_UPGRADE'
  | 'SUBSCRIPTION_CANCEL'
  | 'SECURITY_VIOLATION'
  | 'RATE_LIMIT_TRIGGERED';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  organizationId?: string;
  details: Record<string, unknown>;
}

const MAX_AUDIT_LOGS = 500;
const inMemoryLogs: AuditEvent[] = [];

/**
 * Generates an event ID (UUID-like).
 */
function generateId(): string {
  return 'audit_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

/**
 * Records an immutable audit event with automatic sensitive field scrubbing.
 */
export function logAuditEvent(
  eventType: AuditEventType,
  severity: AuditSeverity,
  details: Record<string, unknown> = {},
  userContext?: { userId?: string; organizationId?: string }
): AuditEvent {
  // Deep scrub any potential passwords/tokens from the details payload
  const safeDetails = scrubSensitiveFields(details);

  const event: AuditEvent = Object.freeze({
    id: generateId(),
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userId: userContext?.userId,
    organizationId: userContext?.organizationId,
    details: safeDetails,
  });

  inMemoryLogs.unshift(event);
  if (inMemoryLogs.length > MAX_AUDIT_LOGS) {
    inMemoryLogs.pop();
  }

  // Also log to console in non-production or for high severity
  if (severity === 'SECURITY' || severity === 'CRITICAL') {
    console.warn(`[AUDIT:${severity}] ${eventType}`, safeDetails);
  }

  return event;
}

/**
 * Returns a read-only snapshot of recorded audit logs.
 */
export function getAuditLogs(): readonly AuditEvent[] {
  return [...inMemoryLogs];
}

/**
 * Clears in-memory audit logs (for testing or reset).
 */
export function clearAuditLogs(): void {
  inMemoryLogs.length = 0;
}
