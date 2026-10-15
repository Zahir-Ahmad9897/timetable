/**
 * @module auth/useRbac
 * @description React hooks for Role-Based Access Control and Subscription Tier evaluation.
 */

import { useAuth } from './AuthProvider';
import { Permission } from './permissions';
import { hasPermission, hasRole, meetsTierRequirement } from './rbac';
import { SubscriptionTier, UserRole } from './types';

/**
 * Hook to evaluate whether the current authenticated user has a specific permission.
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return hasPermission(user, permission);
}

/**
 * Hook to evaluate whether the current user meets a specific role requirement.
 */
export function useRole(minimumRole: UserRole): boolean {
  const { user } = useAuth();
  return hasRole(user, minimumRole);
}

/**
 * Hook to evaluate whether the current user meets a specific subscription tier requirement.
 */
export function useTier(minimumTier: SubscriptionTier): boolean {
  const { user } = useAuth();
  return meetsTierRequirement(user, minimumTier);
}
