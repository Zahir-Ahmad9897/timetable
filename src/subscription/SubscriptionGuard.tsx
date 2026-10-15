/**
 * @module subscription/SubscriptionGuard
 * @description SaaS feature-gating component that conditionally renders premium features
 * or displays an upgrade paywall card.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SubscriptionTier } from '../auth/types';
import { Button, Card, StatusPill } from '../components/ui';
import { colors, radius, space, type } from '../theme';
import { useSubscription } from './SubscriptionProvider';
import { PlanQuota } from './types';

const TIER_WEIGHTS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export interface SubscriptionGuardProps {
  minimumTier?: SubscriptionTier;
  requiredQuota?: keyof PlanQuota;
  featureName?: string;
  description?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function SubscriptionGuard({
  minimumTier,
  requiredQuota,
  featureName = 'This Premium Feature',
  description = 'Upgrade your plan to unlock advanced AI scheduling and institutional exports.',
  fallback,
  children,
}: SubscriptionGuardProps) {
  const { currentPlan, upgradePlan, isLoading } = useSubscription();

  const userTier: SubscriptionTier = currentPlan.tier;
  let allowed = true;

  if (minimumTier) {
    const userWeight = TIER_WEIGHTS[userTier] ?? 0;
    const requiredWeight = TIER_WEIGHTS[minimumTier] ?? 0;
    if (userWeight < requiredWeight) {
      allowed = false;
    }
  }

  if (requiredQuota && allowed) {
    const quotaVal = currentPlan.quotas[requiredQuota];
    if (typeof quotaVal === 'boolean' && !quotaVal) {
      allowed = false;
    }
  }

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <StatusPill tone="warning" label="PRO FEATURE" />
        <Text style={styles.title}>{featureName}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.actions}>
        <Button
          variant="primary"
          label={isLoading ? 'Loading Checkout...' : 'Upgrade to Pro'}
          onPress={() => void upgradePlan('plan_pro', 'month')}
          disabled={isLoading}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    marginVertical: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.xs,
  },
  title: {
    ...type.title,
    color: colors.ink,
  },
  description: {
    ...type.body,
    color: colors.muted,
    marginBottom: space.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});
