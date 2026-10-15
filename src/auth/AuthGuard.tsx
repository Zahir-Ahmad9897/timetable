/**
 * @module auth/AuthGuard
 * @description Route protection component for authenticated-only screens.
 *
 * Wraps screen content and redirects unauthenticated users to the login screen.
 * Supports minimum role and subscription tier requirements.
 *
 * Usage:
 * ```tsx
 * <AuthGuard minimumRole="editor" minimumTier="pro">
 *   <ProtectedScreen />
 * </AuthGuard>
 * ```
 *
 * Architecture note: This component wraps screen content and does NOT modify
 * existing screen components. It is opt-in per route.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthProvider';
import { ROLE_HIERARCHY, SubscriptionTier, UserRole } from './types';
import { colors, space, type } from '../theme';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Minimum role required to access this content */
  minimumRole?: UserRole;
  /** Minimum subscription tier required to access this content */
  minimumTier?: SubscriptionTier;
  /** Custom message shown when access is denied */
  deniedMessage?: string;
  /** If true, show a paywall prompt instead of redirecting */
  showPaywall?: boolean;
}

const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export function AuthGuard({
  children,
  minimumRole = 'viewer',
  minimumTier = 'free',
  deniedMessage = 'You do not have permission to access this feature.',
  showPaywall = false,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  // ---- Loading state -------------------------------------------------------
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Verifying session…</Text>
      </View>
    );
  }

  // ---- Not authenticated → redirect to login -------------------------------
  if (!isAuthenticated || !user) {
    // Use setTimeout to avoid state update during render
    setTimeout(() => router.replace('/login' as never), 0);
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Redirecting to login…</Text>
      </View>
    );
  }

  // ---- Role check ----------------------------------------------------------
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minimumRole]) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Access Restricted</Text>
        <Text style={styles.deniedDetail}>{deniedMessage}</Text>
        <Text style={styles.deniedHint}>
          Your role: {user.role} • Required: {minimumRole}
        </Text>
      </View>
    );
  }

  // ---- Subscription tier check ---------------------------------------------
  if (TIER_HIERARCHY[user.subscriptionTier] < TIER_HIERARCHY[minimumTier]) {
    if (showPaywall) {
      return (
        <View style={styles.center}>
          <Text style={styles.deniedTitle}>Upgrade Required</Text>
          <Text style={styles.deniedDetail}>
            This feature requires the {minimumTier.charAt(0).toUpperCase() + minimumTier.slice(1)} plan.
          </Text>
          <Text style={styles.deniedHint}>
            Current plan: {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>Feature Locked</Text>
        <Text style={styles.deniedDetail}>{deniedMessage}</Text>
      </View>
    );
  }

  // ---- All checks passed ---------------------------------------------------
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: colors.canvas,
  },
  loadingText: {
    marginTop: space.md,
    color: colors.muted,
    ...type.body,
  },
  deniedTitle: {
    color: colors.ink,
    ...type.display,
    textAlign: 'center',
  },
  deniedDetail: {
    marginTop: space.sm,
    color: colors.muted,
    ...type.body,
    textAlign: 'center',
    maxWidth: 400,
  },
  deniedHint: {
    marginTop: space.lg,
    color: colors.subtle,
    ...type.caption,
    textAlign: 'center',
  },
});
