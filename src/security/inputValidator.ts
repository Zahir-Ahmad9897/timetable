/**
 * @module security/inputValidator
 * @description Hardened input validation, XSS prevention, and injection defense.
 *
 * Implements strict defensive validation for user inputs across forms, file imports,
 * and external network payloads.
 */

import { DLP_POLICY, PASSWORD_POLICY } from '../config/constants';

// ---------------------------------------------------------------------------
// XSS and Injection Sanitization
// ---------------------------------------------------------------------------

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escapes HTML special characters to prevent cross-site scripting (XSS).
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitizes generic user text input by trimming, stripping control characters,
 * and normalizing whitespace.
 */
export function sanitizeTextInput(input: string, maxLength = 255): string {
  if (typeof input !== 'string') return '';
  // Strip non-printable ASCII control characters (except newline/tab)
  const clean = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return clean.trim().slice(0, maxLength);
}

/**
 * Sanitizes a filename to protect against path traversal and directory injection.
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return 'unnamed_file';
  // Strip directory separators, null bytes, and traversal patterns
  const base = filename
    .replace(/^.*[\\/]/, '') // remove path
    .replace(/\0/g, '') // remove null bytes
    .replace(/\.\.+/g, '.') // collapse multiple dots
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // allow only alphanumeric + safe punct

  return base.slice(0, 100) || 'unnamed_file';
}

// ---------------------------------------------------------------------------
// Authentication & Password Validation
// ---------------------------------------------------------------------------

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates password against enterprise security policy (NIST SP 800-63B aligned).
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required.'] };
  }

  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long.`);
  }

  if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters.`);
  }

  if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter.');
  }

  if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter.');
  }

  if (PASSWORD_POLICY.REQUIRE_DIGIT && !/[0-9]/.test(password)) {
    errors.push('Password must include at least one number.');
  }

  if (PASSWORD_POLICY.REQUIRE_SPECIAL) {
    const hasSpecial = [...PASSWORD_POLICY.SPECIAL_CHARS].some((char) =>
      password.includes(char)
    );
    if (!hasSpecial) {
      errors.push('Password must include at least one special character.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates email address format with RFC 5322 compliance.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

// ---------------------------------------------------------------------------
// File Import Validation
// ---------------------------------------------------------------------------

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an uploaded file's extension and size against DLP policies.
 */
export function validateImportFile(
  fileName: string,
  fileSizeBytes: number,
): FileValidationResult {
  const lowerName = fileName.toLowerCase();
  const isAllowedExt = DLP_POLICY.ALLOWED_IMPORT_TYPES.some((ext) =>
    lowerName.endsWith(ext)
  );

  if (!isAllowedExt) {
    return {
      valid: false,
      error: `Unsupported file type. Only ${DLP_POLICY.ALLOWED_IMPORT_TYPES.join(', ')} are permitted.`,
    };
  }

  if (fileSizeBytes > DLP_POLICY.MAX_IMPORT_SIZE_BYTES) {
    const maxMb = DLP_POLICY.MAX_IMPORT_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `File exceeds maximum upload size of ${maxMb}MB.`,
    };
  }

  return { valid: true };
}
