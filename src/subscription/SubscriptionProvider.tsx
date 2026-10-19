/**
 * @module subscription/SubscriptionProvider
 * @description React context provider for managing SaaS subscription state, tier entitlements,
 * and Stripe checkout workflows.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { useAuth } from '../auth/AuthProvider';
import { getPlanByTier, PLANS } from './plans';
import * as subscriptionService from './subscriptionService';
import { BillingInterval, SubscriptionContextValue, SubscriptionPlan, UserSubscription } from './types';

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paid entitlements come only from the server's Stripe-backed subscription.
  const currentPlan = useMemo<SubscriptionPlan>(() => {
    const tier = subscription && ['active', 'trialing'].includes(subscription.status)
      ? subscription.tier
      : user?.subscriptionTier || 'free';
    return getPlanByTier(tier);
  }, [subscription?.status, subscription?.tier, user?.subscriptionTier]);

  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const sub = await subscriptionService.getCurrentSubscription();
      setSubscription(sub);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription details.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const upgradePlan = useCallback(
    async (planId: string, interval: BillingInterval) => {
      try {
        setIsLoading(true);
        setError(null);
        const { checkoutUrl } = await subscriptionService.createCheckoutSession(planId, interval);
        if (checkoutUrl) {
          await Linking.openURL(checkoutUrl);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to launch checkout.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const openCustomerPortal = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { portalUrl } = await subscriptionService.createCustomerPortalSession();
      if (portalUrl) {
        await Linking.openURL(portalUrl);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to open billing portal.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      currentPlan,
      isLoading,
      error,
      allPlans: [...PLANS],
      upgradePlan,
      openCustomerPortal,
      refreshSubscription,
    }),
    [
      subscription,
      currentPlan,
      isLoading,
      error,
      upgradePlan,
      openCustomerPortal,
      refreshSubscription,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider.');
  }
  return context;
}
