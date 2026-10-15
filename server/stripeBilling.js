'use strict';

const Stripe = require('stripe');

class BillingError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'BillingError';
    this.status = status;
    this.code = code;
  }
}

function objectId(value) {
  if (typeof value === 'string') return value;
  return value && typeof value.id === 'string' ? value.id : null;
}

function toIso(value, fallback) {
  return Number.isFinite(value) ? new Date(value * 1000).toISOString() : fallback;
}

function localStatus(status) {
  return ['active', 'past_due', 'unpaid', 'canceled'].includes(status) ? status : 'incomplete';
}

function createStripeBilling(options = {}) {
  const env = options.env || process.env;
  const secretKey = env.STRIPE_SECRET_KEY || '';
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || '';
  const appBaseUrl = (env.APP_BASE_URL || '').replace(/\/+$/, '');
  const basePath = options.basePath || '/timetable';
  const stripe = options.stripeClient || (secretKey ? new Stripe(secretKey, {
    maxNetworkRetries: 2,
    timeout: 10_000,
    appInfo: { name: 'irid.ai Timetable', version: '1.0.0' },
  }) : null);
  const catalog = [
    ['plan_pro', 'pro', 'month', env.STRIPE_PRO_MONTHLY_PRICE_ID],
    ['plan_pro', 'pro', 'year', env.STRIPE_PRO_YEARLY_PRICE_ID],
    ['plan_enterprise', 'enterprise', 'month', env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID],
    ['plan_enterprise', 'enterprise', 'year', env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID],
  ].map(([planId, tier, interval, priceId]) => ({ planId, tier, interval, priceId: priceId || '' }));

  function requireConfiguration(webhook = false) {
    const missing = [];
    if (!stripe || !secretKey) missing.push('STRIPE_SECRET_KEY');
    if (!appBaseUrl) missing.push('APP_BASE_URL');
    if (webhook && !webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');
    if (missing.length) {
      throw new BillingError(
        503,
        'BILLING_NOT_CONFIGURED',
        'Billing is unavailable; missing server configuration: ' + missing.join(', ') + '.',
      );
    }
  }

  function resolvePlan(planId, interval) {
    if (!['plan_pro', 'plan_enterprise'].includes(planId)) {
      throw new BillingError(400, 'INVALID_PLAN', 'Select a valid paid subscription plan.');
    }
    if (!['month', 'year'].includes(interval)) {
      throw new BillingError(400, 'INVALID_INTERVAL', 'Billing interval must be month or year.');
    }
    const plan = catalog.find((item) => item.planId === planId && item.interval === interval);
    if (!plan?.priceId.startsWith('price_')) {
      throw new BillingError(503, 'PRICE_NOT_CONFIGURED', 'Stripe price is not configured for this plan.');
    }
    return plan;
  }

  function resolvePrice(priceId) {
    const plan = catalog.find((item) => item.priceId && item.priceId === priceId);
    if (!plan) {
      throw new BillingError(
        400,
        'UNRECOGNIZED_STRIPE_PRICE',
        'The Stripe price is not allowlisted by this deployment.',
      );
    }
    return plan;
  }

  async function createCheckoutSession(user, planId, interval) {
    requireConfiguration();
    const plan = resolvePlan(planId, interval);
    const returnBase = appBaseUrl + basePath;
    const metadata = { userId: user.id, planId: plan.planId, interval: plan.interval };
    const params = {
      mode: 'subscription',
      client_reference_id: user.id,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: returnBase + '/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: returnBase + '/pricing?checkout=cancelled',
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
    };
    if (user.stripeCustomerId) params.customer = user.stripeCustomerId;
    else params.customer_email = user.email;

    const session = await stripe.checkout.sessions.create(params);
    if (!session?.id || !session.url) {
      throw new BillingError(502, 'STRIPE_CHECKOUT_FAILED', 'Stripe did not return a checkout URL.');
    }
    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      pendingCheckout: {
        sessionId: session.id,
        userId: user.id,
        planId: plan.planId,
        tier: plan.tier,
        interval: plan.interval,
        priceId: plan.priceId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  function constructWebhookEvent(rawBody, signature) {
    requireConfiguration(true);
    if (!signature || typeof signature !== 'string') {
      throw new BillingError(400, 'MISSING_STRIPE_SIGNATURE', 'Missing Stripe-Signature header.');
    }
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret, 300);
    } catch {
      throw new BillingError(400, 'INVALID_STRIPE_SIGNATURE', 'Stripe webhook signature is invalid.');
    }
  }

  function upsertSubscription(db, user, stripeSubscription, plan) {
    const now = new Date().toISOString();
    const item = stripeSubscription.items?.data?.[0];
    const entitled = stripeSubscription.status === 'active';
    const customerId = objectId(stripeSubscription.customer);
    user.subscriptionTier = entitled ? plan.tier : 'free';
    if (customerId) user.stripeCustomerId = customerId;

    let local = db.subscriptions.find(
      (sub) => sub.stripeSubscriptionId === stripeSubscription.id || sub.userId === user.id,
    );
    if (!local) {
      local = { id: stripeSubscription.id, userId: user.id };
      db.subscriptions.push(local);
    }
    Object.assign(local, {
      id: stripeSubscription.id,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customerId || local.stripeCustomerId,
      userId: user.id,
      planId: plan.planId,
      tier: entitled ? plan.tier : 'free',
      status: localStatus(stripeSubscription.status),
      interval: plan.interval,
      currentPeriodStart: toIso(
        stripeSubscription.current_period_start ?? item?.current_period_start,
        now,
      ),
      currentPeriodEnd: toIso(
        stripeSubscription.current_period_end ?? item?.current_period_end,
        now,
      ),
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
      canceledAt: stripeSubscription.canceled_at
        ? toIso(stripeSubscription.canceled_at, now)
        : undefined,
    });
    return { changed: true, userId: user.id, tier: user.subscriptionTier };
  }

  async function provisionCheckout(session, db) {
    if (session.mode !== 'subscription' || session.payment_status !== 'paid') {
      return { changed: false, reason: 'checkout_not_paid' };
    }
    const pending = db.pendingCheckouts.find((item) => item.sessionId === session.id);
    if (!pending || pending.status !== 'pending') {
      return { changed: false, reason: 'unknown_checkout_session' };
    }
    if (
      session.client_reference_id !== pending.userId ||
      session.metadata?.userId !== pending.userId ||
      session.metadata?.planId !== pending.planId ||
      session.metadata?.interval !== pending.interval
    ) {
      throw new BillingError(400, 'CHECKOUT_METADATA_MISMATCH', 'Checkout ownership is invalid.');
    }
    const subscriptionId = objectId(session.subscription);
    if (!subscriptionId) {
      throw new BillingError(400, 'MISSING_STRIPE_SUBSCRIPTION', 'Paid checkout has no subscription.');
    }
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
    if (priceId !== pending.priceId) {
      throw new BillingError(400, 'CHECKOUT_PRICE_MISMATCH', 'Paid price does not match the requested plan.');
    }
    const user = db.users.find((item) => item.id === pending.userId);
    if (!user) throw new BillingError(404, 'BILLING_USER_NOT_FOUND', 'Checkout user no longer exists.');
    const result = upsertSubscription(db, user, stripeSubscription, resolvePrice(priceId));
    pending.status = 'completed';
    pending.completedAt = new Date().toISOString();
    return result;
  }

  function reconcileSubscription(stripeSubscription, db) {
    const existing = db.subscriptions.find(
      (sub) => sub.stripeSubscriptionId === stripeSubscription.id,
    );
    if (!existing) return { changed: false, reason: 'unknown_subscription' };
    const user = db.users.find((item) => item.id === existing.userId);
    if (!user) throw new BillingError(404, 'BILLING_USER_NOT_FOUND', 'Subscription owner is missing.');
    const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
    return upsertSubscription(db, user, stripeSubscription, resolvePrice(priceId));
  }

  async function processWebhookEvent(event, db) {
    db.processedStripeEvents ||= [];
    db.pendingCheckouts ||= [];
    db.subscriptions ||= [];
    if (db.processedStripeEvents.includes(event.id)) return { duplicate: true, changed: false };

    let result = { changed: false, reason: 'event_ignored' };
    if ([
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
    ].includes(event.type)) {
      result = await provisionCheckout(event.data.object, db);
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const pending = db.pendingCheckouts.find((item) => item.sessionId === event.data.object.id);
      if (pending) pending.status = 'failed';
    } else if ([
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ].includes(event.type)) {
      result = reconcileSubscription(event.data.object, db);
    }
    db.processedStripeEvents.push(event.id);
    if (db.processedStripeEvents.length > 2_000) {
      db.processedStripeEvents.splice(0, db.processedStripeEvents.length - 2_000);
    }
    return { ...result, duplicate: false };
  }

  return { createCheckoutSession, constructWebhookEvent, processWebhookEvent, resolvePlan };
}

module.exports = { BillingError, createStripeBilling };
