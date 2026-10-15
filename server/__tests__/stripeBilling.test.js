'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const Stripe = require('stripe');
const { BillingError, createStripeBilling } = require('../stripeBilling');

const TEST_ENV = {
  APP_BASE_URL: 'https://timetable.example.com',
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  STRIPE_PRO_MONTHLY_PRICE_ID: 'price_pro_month',
  STRIPE_PRO_YEARLY_PRICE_ID: 'price_pro_year',
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: 'price_enterprise_month',
  STRIPE_ENTERPRISE_YEARLY_PRICE_ID: 'price_enterprise_year',
};

function activeStripeSubscription(overrides = {}) {
  return {
    id: 'sub_paid_1',
    customer: 'cus_1',
    status: 'active',
    current_period_start: 1_797_120_000,
    current_period_end: 1_799_798_400,
    cancel_at_period_end: false,
    canceled_at: null,
    items: { data: [{ price: { id: 'price_pro_month' } }] },
    ...overrides,
  };
}

function createFixture(subscription = activeStripeSubscription()) {
  let checkoutParams;
  const stripeClient = {
    checkout: {
      sessions: {
        create: async (params) => {
          checkoutParams = params;
          return { id: 'cs_paid_1', url: 'https://checkout.stripe.com/c/pay/cs_paid_1' };
        },
      },
    },
    subscriptions: {
      retrieve: async () => subscription,
    },
    webhooks: {
      constructEvent: () => {
        throw new Error('invalid signature');
      },
    },
  };
  return {
    billing: createStripeBilling({ env: TEST_ENV, stripeClient }),
    getCheckoutParams: () => checkoutParams,
  };
}

function createDb() {
  return {
    users: [{ id: 'usr_1', email: 'buyer@example.com', subscriptionTier: 'free' }],
    subscriptions: [],
    pendingCheckouts: [],
    processedStripeEvents: [],
  };
}

describe('Stripe-backed subscription provisioning', () => {
  it('creates only a pending checkout and never upgrades the user directly', async () => {
    const { billing, getCheckoutParams } = createFixture();
    const db = createDb();
    const result = await billing.createCheckoutSession(db.users[0], 'plan_pro', 'month');

    assert.equal(db.users[0].subscriptionTier, 'free');
    assert.equal(db.subscriptions.length, 0);
    assert.equal(result.pendingCheckout.status, 'pending');
    assert.equal(result.pendingCheckout.priceId, 'price_pro_month');
    assert.equal(getCheckoutParams().mode, 'subscription');
    assert.equal(getCheckoutParams().client_reference_id, 'usr_1');
  });

  it('does not grant access for an unpaid checkout event', async () => {
    const { billing } = createFixture();
    const db = createDb();
    const checkout = await billing.createCheckoutSession(db.users[0], 'plan_pro', 'month');
    db.pendingCheckouts.push(checkout.pendingCheckout);

    await billing.processWebhookEvent({
      id: 'evt_unpaid',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: checkout.sessionId,
          mode: 'subscription',
          payment_status: 'unpaid',
        },
      },
    }, db);

    assert.equal(db.users[0].subscriptionTier, 'free');
    assert.equal(db.subscriptions.length, 0);
  });

  it('grants access once for a paid, owned, allowlisted checkout', async () => {
    const { billing } = createFixture();
    const db = createDb();
    const checkout = await billing.createCheckoutSession(db.users[0], 'plan_pro', 'month');
    db.pendingCheckouts.push(checkout.pendingCheckout);
    const event = {
      id: 'evt_paid',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: checkout.sessionId,
          mode: 'subscription',
          payment_status: 'paid',
          client_reference_id: 'usr_1',
          customer: 'cus_1',
          subscription: 'sub_paid_1',
          metadata: { userId: 'usr_1', planId: 'plan_pro', interval: 'month' },
        },
      },
    };

    const first = await billing.processWebhookEvent(event, db);
    const replay = await billing.processWebhookEvent(event, db);

    assert.equal(first.changed, true);
    assert.equal(db.users[0].subscriptionTier, 'pro');
    assert.equal(db.subscriptions[0].stripeSubscriptionId, 'sub_paid_1');
    assert.equal(db.pendingCheckouts[0].status, 'completed');
    assert.equal(replay.duplicate, true);
    assert.equal(db.subscriptions.length, 1);
  });

  it('rejects webhook requests whose Stripe signature is invalid', () => {
    const { billing } = createFixture();
    assert.throws(
      () => billing.constructWebhookEvent(Buffer.from('{}'), 't=1,v1=invalid'),
      (error) => error instanceof BillingError && error.code === 'INVALID_STRIPE_SIGNATURE',
    );
  });

  it('accepts an authentic Stripe signature over the exact raw body', () => {
    const stripeClient = new Stripe(TEST_ENV.STRIPE_SECRET_KEY);
    const payload = JSON.stringify({ id: 'evt_signed', type: 'test.event', data: { object: {} } });
    const signature = stripeClient.webhooks.generateTestHeaderString({
      payload,
      secret: TEST_ENV.STRIPE_WEBHOOK_SECRET,
    });
    const billing = createStripeBilling({ env: TEST_ENV, stripeClient });

    const event = billing.constructWebhookEvent(Buffer.from(payload), signature);
    assert.equal(event.id, 'evt_signed');
  });
});
