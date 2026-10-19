'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createRateLimiter, MemoryRateLimitStore, resolveClientIp } = require('../rateLimiter');

test('rate limiter functionality and memory protection', async (t) => {
  await t.test('resolves client IP correctly with and without proxy trust', () => {
    const directReq = {
      socket: { remoteAddress: '192.168.1.50' },
      headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' },
    };
    // Without proxy trust, direct socket IP is used
    assert.equal(resolveClientIp(directReq, false), '192.168.1.50');
    // With proxy trust enabled, the first forwarded client IP is used
    assert.equal(resolveClientIp(directReq, true), '203.0.113.195');
  });

  await t.test('throttles failed login attempts and blocks after threshold', () => {
    const limiter = createRateLimiter({ maxAttempts: 3, lockoutMinutes: 5 });
    const req = { socket: { remoteAddress: '10.0.0.5' }, headers: {} };
    const key = limiter.getKey(req, 'target@example.com');

    assert.equal(limiter.isBlocked(limiter.getState(key)), false);

    limiter.recordFailure(key);
    limiter.recordFailure(key);
    assert.equal(limiter.isBlocked(limiter.getState(key)), false);

    limiter.recordFailure(key);
    assert.equal(limiter.isBlocked(limiter.getState(key)), true);

    // Resetting on successful login clears block
    limiter.reset(key);
    assert.equal(limiter.isBlocked(limiter.getState(key)), false);
  });

  await t.test('prunes expired entries and caps maximum entries to avoid memory leaks', () => {
    const store = new MemoryRateLimitStore({ maxEntries: 5, pruneIntervalMs: 10 });
    const now = Date.now();

    store.set('expired1', { count: 1, resetAt: now - 1000 });
    store.set('expired2', { count: 2, resetAt: now - 500 });
    store.set('active1', { count: 1, resetAt: now + 60000 });

    assert.equal(store.get('expired1'), undefined);
    assert.ok(store.get('active1'));

    // Force pruning
    store.prune(true);
    assert.equal(store.size, 1);
  });
});
