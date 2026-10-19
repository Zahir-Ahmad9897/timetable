'use strict';

/**
 * Enterprise Rate Limiter & Lockout Defense
 *
 * Supports both standalone in-process operation (with auto-pruning to prevent memory leaks)
 * and pluggable shared stores (e.g. Redis / Valkey) for multi-instance load-balanced clusters.
 */

class MemoryRateLimitStore {
  constructor(options = {}) {
    this.store = new Map();
    this.maxEntries = options.maxEntries || 10_000;
    this.pruneIntervalMs = options.pruneIntervalMs || 60_000;
    this.lastPrune = Date.now();
  }

  get(key) {
    this.maybePrune();
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.resetAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key, value) {
    this.maybePrune();
    if (this.store.size >= this.maxEntries) {
      this.prune(true);
    }
    this.store.set(key, value);
    return this;
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }

  prune(force = false) {
    const now = Date.now();
    if (!force && now - this.lastPrune < this.pruneIntervalMs) return;
    this.lastPrune = now;
    for (const [key, entry] of this.store.entries()) {
      if (!entry || entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  maybePrune() {
    if (Date.now() - this.lastPrune > this.pruneIntervalMs) {
      this.prune();
    }
  }
}

/**
 * Distributed Redis Store Adapter Interface.
 * Can be instantiated when REDIS_URL is provided for multi-node deployments.
 */
class RedisRateLimitAdapter {
  constructor(client) {
    this.client = client;
  }

  async get(key) {
    const raw = await this.client.get(`ratelimit:${key}`);
    return raw ? JSON.parse(raw) : undefined;
  }

  async set(key, value) {
    const ttlSeconds = Math.max(1, Math.ceil((value.resetAt - Date.now()) / 1000));
    await this.client.set(`ratelimit:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(key) {
    await this.client.del(`ratelimit:${key}`);
  }
}

function resolveClientIp(req, trustProxy = false) {
  if (trustProxy || process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      return realIp.trim();
    }
  }
  return req.socket.remoteAddress || 'unknown';
}

function createRateLimiter(options = {}) {
  const store = options.store || new MemoryRateLimitStore(options);
  const lockoutMinutes = Number(options.lockoutMinutes || process.env.AUTH_LOCKOUT_DURATION_MINUTES) || 15;
  const maxAttempts = Number(options.maxAttempts || process.env.AUTH_MAX_LOGIN_ATTEMPTS) || 5;
  const trustProxy = options.trustProxy ?? (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1');

  function getKey(req, identifier) {
    const ip = resolveClientIp(req, trustProxy);
    const id = String(identifier || '').toLowerCase().trim();
    return `${ip}:${id}`;
  }

  function getState(key) {
    const now = Date.now();
    const windowMs = lockoutMinutes * 60_000;
    const current = store.get(key);
    if (!current || current.resetAt <= now) {
      const fresh = { count: 0, resetAt: now + windowMs };
      store.set(key, fresh);
      return fresh;
    }
    return current;
  }

  function recordFailure(key) {
    const state = getState(key);
    state.count += 1;
    store.set(key, state);
    return state;
  }

  function reset(key) {
    store.delete(key);
  }

  function isBlocked(state) {
    return state.count >= maxAttempts && state.resetAt > Date.now();
  }

  return {
    store,
    getKey,
    getState,
    recordFailure,
    reset,
    isBlocked,
    maxAttempts,
    lockoutMinutes,
  };
}

module.exports = {
  createRateLimiter,
  MemoryRateLimitStore,
  RedisRateLimitAdapter,
  resolveClientIp,
};
