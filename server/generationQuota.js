'use strict';

const LIMITS = Object.freeze({ free: 5, pro: 100, enterprise: -1 });

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function getGenerationUsage(user, now = new Date()) {
  const tier = Object.prototype.hasOwnProperty.call(LIMITS, user.subscriptionTier)
    ? user.subscriptionTier
    : 'free';
  const limit = LIMITS[tier];
  if (tier === 'enterprise') return { used: 0, limit, remaining: -1 };

  const used = tier === 'pro'
    ? user.generationDailyDate === utcDay(now) ? Number(user.generationDailyCount) || 0 : 0
    : Number(user.generationCount) || 0;
  return { used, limit, remaining: Math.max(0, limit - used) };
}

function consumeGeneration(user, now = new Date()) {
  const usage = getGenerationUsage(user, now);
  if (usage.limit < 0) return usage;
  if (usage.used >= usage.limit) return null;

  if (user.subscriptionTier === 'pro') {
    user.generationDailyDate = utcDay(now);
    user.generationDailyCount = usage.used + 1;
  } else {
    user.generationCount = usage.used + 1;
  }
  return getGenerationUsage(user, now);
}

function resetGenerationUsage(user) {
  user.generationCount = 0;
  user.generationDailyCount = 0;
  user.generationDailyDate = undefined;
}

module.exports = { consumeGeneration, getGenerationUsage, resetGenerationUsage };
