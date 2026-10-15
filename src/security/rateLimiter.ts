/**
 * @module security/rateLimiter
 * @description In-memory sliding-window rate limiter for client-side abuse mitigation.
 *
 * Prevents rapid-fire requests, brute-force credential stuffing, and resource exhaustion.
 */

import { RATE_LIMITS } from '../config/constants';

interface RateLimitRecord {
  timestamps: number[];
  lockedUntil?: number;
}

const records = new Map<string, RateLimitRecord>();

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Checks if an action is permitted under the rate limit policy.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = RATE_LIMITS.AUTH_MAX_REQUESTS,
  windowMs: number = RATE_LIMITS.WINDOW_MS,
  lockoutDurationMs?: number,
): RateLimitStatus {
  const now = Date.now();
  let record = records.get(key);

  if (!record) {
    record = { timestamps: [] };
    records.set(key, record);
  }

  // Check if currently locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: record.lockedUntil - now,
    };
  }

  // Filter timestamps within current rolling window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    if (lockoutDurationMs) {
      record.lockedUntil = now + lockoutDurationMs;
    }
    const oldest = record.timestamps[0] || now;
    const retryAfter = lockoutDurationMs || (windowMs - (now - oldest));

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfter),
    };
  }

  // Record this attempt
  record.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxAttempts - record.timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Convenience helper specifically for login attempt rate-limiting.
 */
export function checkLoginRateLimit(identifier: string): RateLimitStatus {
  return checkRateLimit(
    `auth:login:${identifier.toLowerCase().trim()}`,
    RATE_LIMITS.LOGIN_MAX_ATTEMPTS,
    RATE_LIMITS.LOGIN_LOCKOUT_MINUTES * 60 * 1000,
    RATE_LIMITS.LOGIN_LOCKOUT_MINUTES * 60 * 1000
  );
}

/**
 * Resets the rate limit counter for a key (e.g. after successful authentication).
 */
export function resetRateLimit(key: string): void {
  records.delete(key);
}
