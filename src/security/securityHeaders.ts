/**
 * @module security/securityHeaders
 * @description Standardized HTTP security headers and Content Security Policy (CSP) builder.
 *
 * Provides production-ready security headers compliant with OWASP standards:
 * - Content-Security-Policy (CSP)
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options (Clickjacking defense)
 * - X-Content-Type-Options (MIME sniffing defense)
 * - Referrer-Policy
 * - Permissions-Policy
 */

import { SECURITY_HEADERS } from '../config/constants';

/**
 * Builds standard Content Security Policy directives.
 */
export function buildContentSecurityPolicy(isDev = false): string {
  const scriptSources = ["'self'", "'unsafe-inline'"];
  if (isDev) {
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')} https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
}

/**
 * Generates an immutable dictionary of production HTTP security headers.
 */
export function getProductionSecurityHeaders(isDev = false): Record<string, string> {
  return Object.freeze({
    'Content-Security-Policy': buildContentSecurityPolicy(isDev),
    'Strict-Transport-Security': `max-age=${SECURITY_HEADERS.HSTS_MAX_AGE}; includeSubDomains; preload`,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': SECURITY_HEADERS.PERMISSIONS_POLICY,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-XSS-Protection': '0', // Modern recommendation: disable legacy buggy XSS auditor in favor of CSP
  });
}
