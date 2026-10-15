/**
 * @module subscription/PricingScreen
 * @description SaaS pricing and subscription tier management view.
 *
 * Implements a high-conversion SaaS tier selector:
 * - Free vs Pro vs Enterprise tiers
 * - Monthly vs Annual billing toggle with 20% savings badge
 * - Instant checkout launch via Stripe
 * - Customer portal access for active subscribers
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Button, StatusPill } from '../components/ui';
import { colors, radius, space, type } from '../theme';
import { PLANS } from './plans';
import { useSubscription } from './SubscriptionProvider';
import { BillingInterval, SubscriptionPlan } from './types';

export function PricingScreen() {
  const { user } = useAuth();
  const { upgradePlan, openCustomerPortal, isLoading } = useSubscription();
  const [interval, setInterval] = useState<BillingInterval>('year');

  const currentTier = user?.subscriptionTier || 'free';

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.tier === currentTier) return;
    await upgradePlan(plan.id, interval);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Upgrade Your Scheduling Power</Text>
        <Text style={styles.heroSubtitle}>
          Choose the plan that fits your faculty, department, or entire institution.
        </Text>

        {/* Monthly / Annual Billing Toggle */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, interval === 'month' && styles.toggleButtonActive]}
            onPress={() => setInterval('month')}
          >
            <Text style={[styles.toggleText, interval === 'month' && styles.toggleTextActive]}>
              Monthly
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, interval === 'year' && styles.toggleButtonActive]}
            onPress={() => setInterval('year')}
          >
            <Text style={[styles.toggleText, interval === 'year' && styles.toggleTextActive]}>
              Annual (Save 20%)
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Pricing Cards Grid */}
      <View style={styles.cardsGrid}>
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isPro = plan.tier === 'pro';
          const price = interval === 'year' ? Math.round(plan.price.year / 12) : plan.price.month;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                isPro && styles.planCardHighlighted,
                isCurrent && styles.planCardCurrent,
              ]}
            >
              {plan.badge && (
                <View style={styles.badgeWrapper}>
                  <StatusPill tone="info" label={plan.badge} />
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planTagline}>{plan.tagline}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceCurrency}>$</Text>
                <Text style={styles.priceAmount}>{price}</Text>
                <Text style={styles.pricePeriod}>/month</Text>
              </View>
              {interval === 'year' && plan.price.year > 0 && (
                <Text style={styles.billedYearly}>Billed ${plan.price.year} annually</Text>
              )}

              <View style={styles.divider} />

              <View style={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Text
                      style={[
                        styles.featureCheck,
                        feature.included ? styles.checkIncluded : styles.checkExcluded,
                      ]}
                    >
                      {feature.included ? '✓' : '—'}
                    </Text>
                    <Text
                      style={[
                        styles.featureTitle,
                        !feature.included && styles.featureTitleMuted,
                        feature.highlight && styles.featureTitleHighlight,
                      ]}
                    >
                      {feature.title}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardAction}>
                <Button
                  variant={isCurrent ? 'secondary' : isPro ? 'primary' : 'secondary'}
                  label={isCurrent ? 'Current Plan' : isPro ? 'Upgrade to Pro' : 'Choose Plan'}
                  onPress={() => void handleSelectPlan(plan)}
                  disabled={isCurrent || isLoading}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Customer Billing Portal Link */}
      {currentTier !== 'free' && (
        <View style={styles.portalSection}>
          <Text style={styles.portalText}>Need to update payment method or download invoices?</Text>
          <Button
            variant="quiet"
            label="Manage Billing & Invoices ↗"
            onPress={() => void openCustomerPortal()}
            disabled={isLoading}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: space.md,
    paddingBottom: space.xxl,
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: space.xl,
  },
  heroTitle: {
    ...type.display,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: space.xs,
  },
  heroSubtitle: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 540,
    marginBottom: space.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleButton: {
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
  },
  toggleButtonActive: {
    backgroundColor: colors.surface,
  },
  toggleText: {
    ...type.caption,
    color: colors.muted,
  },
  toggleTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    justifyContent: 'center',
  },
  planCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 340,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  planCardHighlighted: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  planCardCurrent: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeWrapper: {
    position: 'absolute',
    top: space.md,
    right: space.md,
  },
  planName: {
    ...type.title,
    color: colors.ink,
    marginBottom: 4,
  },
  planTagline: {
    ...type.caption,
    color: colors.muted,
    marginBottom: space.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    ...type.title,
    color: colors.ink,
  },
  priceAmount: {
    ...type.display,
    color: colors.ink,
    marginRight: 4,
  },
  pricePeriod: {
    ...type.caption,
    color: colors.muted,
  },
  billedYearly: {
    ...type.caption,
    color: colors.subtle,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.md,
  },
  featuresList: {
    gap: space.xs + 2,
    marginBottom: space.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  featureCheck: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  checkIncluded: {
    color: colors.success,
  },
  checkExcluded: {
    color: colors.subtle,
  },
  featureTitle: {
    ...type.caption,
    color: colors.ink,
    flex: 1,
  },
  featureTitleMuted: {
    color: colors.subtle,
  },
  featureTitleHighlight: {
    fontWeight: '700',
  },
  cardAction: {
    marginTop: 'auto',
  },
  portalSection: {
    alignItems: 'center',
    marginTop: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  portalText: {
    ...type.body,
    color: colors.muted,
    marginBottom: space.xs,
  },
});
