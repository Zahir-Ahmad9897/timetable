/**
 * @module subscription/subscriptionService
 * @description HTTP client and billing lifecycle manager for SaaS subscriptions.
 *
 * Communicates with the SaaS backend and Stripe Billing.
 * Handles authenticated requests and fails closed when billing is unavailable.
 */

import { getAccessToken } from '../auth/tokenManager';
import { getEnvironmentConfig } from '../config/environment';
import {
  BillingInterval,
  CheckoutSessionResponse,
  CustomerPortalSessionResponse,
  Invoice,
  UserSubscription,
} from './types';

function getApiUrl(): string {
  return getEnvironmentConfig().API_URL.replace(/\/+$/, '');
}


/**
 * Retrieves the currently active user subscription.
 */
export async function getCurrentSubscription(): Promise<UserSubscription | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${getApiUrl()}/api/subscription`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch subscription');

    const data = await response.json();
    return data.subscription as UserSubscription;
  } catch {
    // Offline or demo fallback: return local Pro trial simulation if user has local session
    return {
      id: 'sub_demo_active',
      userId: 'usr_local_user',
      planId: 'plan_free',
      tier: 'free',
      status: 'active',
      interval: 'month',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    };
  }
}

/**
 * Creates a Stripe checkout session to upgrade or change a subscription plan.
 */
export async function createCheckoutSession(
  planId: string,
  interval: BillingInterval
): Promise<CheckoutSessionResponse> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to upgrade your subscription.');
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/subscription/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId, interval }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message || 'Secure checkout could not be created.');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') {
      throw error;
    }
    throw new Error(
      'Secure checkout is unavailable. Your subscription was not changed. Check your connection and try again.',
    );
  }
}


/**
 * Creates a Stripe Customer Portal session for billing management (cards, invoices, cancellation).
 */
export async function createCustomerPortalSession(): Promise<CustomerPortalSessionResponse> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to manage billing.');
  }

  const response = await fetch(`${getApiUrl()}/api/subscription/portal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to open billing portal.');
  }

  return response.json();
}

/**
 * Cancels the user subscription at the end of the current billing cycle.
 */
export async function cancelSubscription(): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated.');

  const response = await fetch(`${getApiUrl()}/api/subscription/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel subscription.');
  }
}

/**
 * Resumes a subscription scheduled for cancellation.
 */
export async function resumeSubscription(): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated.');

  const response = await fetch(`${getApiUrl()}/api/subscription/resume`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to resume subscription.');
  }
}

/**
 * Fetches billing invoice history.
 */
export async function getInvoices(): Promise<Invoice[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const response = await fetch(`${getApiUrl()}/api/subscription/invoices`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.invoices || [];
  } catch {
    return [];
  }
}
