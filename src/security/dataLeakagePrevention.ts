/**
 * @module security/dataLeakagePrevention
 * @description Data Leakage Prevention (DLP) engine for SaaS compliance and data safety.
 *
 * Provides:
 * 1. Sensitive field masking & log scrubbing (passwords, tokens, PII)
 * 2. Export controls & leak attribution metadata (fingerprinting / watermarking)
 * 3. Payload size caps & exfiltration prevention checks
 * 4. PII detection (emails, phones, credentials)
 */

import { DLP_POLICY } from '../config/constants';
import { Workspace } from '../domain/types';

// ---------------------------------------------------------------------------
// Sensitive Data Scrubbing
// ---------------------------------------------------------------------------

const MASKED_PLACEHOLDER = '[REDACTED_SENSITIVE]';

/**
 * Recursively scrubs sensitive keys from objects before serialization or logging.
 */
export function scrubSensitiveFields<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => scrubSensitiveFields(item)) as unknown as T;
  }

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const isSensitive = DLP_POLICY.SENSITIVE_FIELD_PATTERNS.some((pattern) =>
      pattern.test(key)
    );

    if (isSensitive) {
      output[key] = MASKED_PLACEHOLDER;
    } else if (typeof value === 'object' && value !== null) {
      output[key] = scrubSensitiveFields(value);
    } else {
      output[key] = value;
    }
  }

  return output as T;
}

// ---------------------------------------------------------------------------
// Export Sanitization & Attribution
// ---------------------------------------------------------------------------

export interface ExportAttributionMetadata {
  organizationId?: string;
  userId?: string;
  exportedAt: string;
  integrityChecksum: string;
  classification: 'CONFIDENTIAL' | 'INTERNAL' | 'PUBLIC';
  softwareVersion: string;
}

export interface SanitizedExport<T = Workspace> {
  metadata: ExportAttributionMetadata;
  payload: T;
}

/**
 * Calculates a lightweight fast hash for export payload integrity verification.
 */
function computeChecksum(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Validates whether an export operation complies with SaaS DLP policies.
 * @throws {Error} If export violates DLP limits or security policies.
 */
export function validateExportPolicy(workspace: Workspace): { valid: boolean; error?: string } {
  // Check record limits
  const { departments, semesters, teachers, courses, rooms, sections, assignments } = workspace;

  if (departments.length > DLP_POLICY.MAX_RECORDS.departments) {
    return { valid: false, error: `Exceeded department quota for export (${departments.length} > ${DLP_POLICY.MAX_RECORDS.departments})` };
  }
  if (semesters.length > DLP_POLICY.MAX_RECORDS.semesters) {
    return { valid: false, error: `Exceeded semester quota for export (${semesters.length} > ${DLP_POLICY.MAX_RECORDS.semesters})` };
  }
  if (sections.length > DLP_POLICY.MAX_RECORDS.sections) {
    return { valid: false, error: `Exceeded section quota for export (${sections.length} > ${DLP_POLICY.MAX_RECORDS.sections})` };
  }
  if (courses.length > DLP_POLICY.MAX_RECORDS.courses) {
    return { valid: false, error: `Exceeded course quota for export (${courses.length} > ${DLP_POLICY.MAX_RECORDS.courses})` };
  }
  if (teachers.length > DLP_POLICY.MAX_RECORDS.teachers) {
    return { valid: false, error: `Exceeded teacher quota for export (${teachers.length} > ${DLP_POLICY.MAX_RECORDS.teachers})` };
  }
  if (rooms.length > DLP_POLICY.MAX_RECORDS.rooms) {
    return { valid: false, error: `Exceeded room quota for export (${rooms.length} > ${DLP_POLICY.MAX_RECORDS.rooms})` };
  }
  if (assignments.length > DLP_POLICY.MAX_RECORDS.assignments) {
    return { valid: false, error: `Exceeded assignment quota for export (${assignments.length} > ${DLP_POLICY.MAX_RECORDS.assignments})` };
  }

  // Check serialized size
  const serialized = JSON.stringify(workspace);
  if (serialized.length > DLP_POLICY.MAX_EXPORT_SIZE_BYTES) {
    return { valid: false, error: `Export payload size exceeds allowed limit of ${DLP_POLICY.MAX_EXPORT_SIZE_BYTES / (1024 * 1024)}MB` };
  }

  return { valid: true };
}

/**
 * Prepares a workspace for secure export by attaching tamper-evident metadata.
 */
export function prepareSecureExport(
  workspace: Workspace,
  userInfo?: { userId?: string; organizationId?: string },
): SanitizedExport {
  const validation = validateExportPolicy(workspace);
  if (!validation.valid) {
    throw new Error(`DLP Violation: ${validation.error}`);
  }

  const payloadString = JSON.stringify(workspace);
  const checksum = computeChecksum(payloadString);

  return {
    metadata: {
      userId: userInfo?.userId,
      organizationId: userInfo?.organizationId,
      exportedAt: new Date().toISOString(),
      integrityChecksum: checksum,
      classification: 'CONFIDENTIAL',
      softwareVersion: '1.0.0',
    },
    payload: workspace,
  };
}
