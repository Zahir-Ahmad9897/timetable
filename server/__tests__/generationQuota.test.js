'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { consumeGeneration, getGenerationUsage, resetGenerationUsage } = require('../generationQuota');

test('server generation quotas', async (t) => {
  const today = new Date('2026-10-16T12:00:00.000Z');

  await t.test('enforces five lifetime runs for Free accounts', () => {
    const user = { subscriptionTier: 'free', generationCount: 4 };
    assert.deepEqual(consumeGeneration(user, today), { used: 5, limit: 5, remaining: 0 });
    assert.equal(consumeGeneration(user, today), null);
  });

  await t.test('enforces and resets the Pro daily allowance', () => {
    const user = { subscriptionTier: 'pro', generationDailyDate: '2026-10-16', generationDailyCount: 99 };
    assert.deepEqual(consumeGeneration(user, today), { used: 100, limit: 100, remaining: 0 });
    assert.equal(consumeGeneration(user, today), null);
    assert.deepEqual(getGenerationUsage(user, new Date('2026-10-17T00:00:01.000Z')), { used: 0, limit: 100, remaining: 100 });
  });

  await t.test('keeps Mega unlimited and resets all counters for administrators', () => {
    const mega = { subscriptionTier: 'enterprise', generationCount: 500 };
    assert.deepEqual(consumeGeneration(mega, today), { used: 0, limit: -1, remaining: -1 });
    const pro = { subscriptionTier: 'pro', generationCount: 8, generationDailyDate: '2026-10-16', generationDailyCount: 20 };
    resetGenerationUsage(pro);
    assert.deepEqual(getGenerationUsage(pro, today), { used: 0, limit: 100, remaining: 100 });
    assert.equal(pro.generationCount, 0);
  });
});
