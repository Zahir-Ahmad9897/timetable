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
  UserSubscription,
} from './types';

function getApiUrl(): string {
  return getEnvironmentConfig().API_URL.replace(/\/+$/, '');
}

export interface GenerationUsage { used: number; limit: number; remaining: number }

async function generationUsageRequest(path: string, method: 'GET' | 'POST'): Promise<GenerationUsage> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in before generating a timetable.');
  const response = await fetch(`${getApiUrl()}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Generation allowance could not be verified.');
  return body as GenerationUsage;
}

export const getGenerationUsage = () => generationUsageRequest('/api/usage/generation', 'GET');
export const consumeGeneration = () => generationUsageRequest('/api/usage/generation/consume', 'POST');


/**
 * Retrieves the currently active user subscription.
 */
export async function getCurrentSubscription(): Promise<UserSubscription | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await fetch(`${getApiUrl()}/api/subscription`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || 'Subscription details could not be loaded.');
  }

  const data = await response.json() as { subscription: UserSubscription };
  return data.subscription;
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
