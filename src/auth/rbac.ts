/**
 * @module auth/rbac
 * @description Role-Based Access Control (RBAC) and Subscription Gating engine.
 *
 * Implements dual-layer authorization:
 * Layer 1: Role check — Does the user's role permit the operation?
 * Layer 2: Tier check — Does the user's subscription tier unlock this feature?
 *
 * Both layers must pass for an action to be authorized.
 */

import { SUBSCRIPTION_TIERS } from '../config/constants';
import { Permission, ROLE_PERMISSIONS, TIER_PERMISSIONS } from './permissions';
import { ROLE_HIERARCHY, SubscriptionTier, User, UserRole } from './types';

// ---------------------------------------------------------------------------
// Tier Hierarchy
// ---------------------------------------------------------------------------

const TIER_HIERARCHY: Record<SubscriptionTier, number> = Object.freeze({
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.PRO]: 1,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 2,
});

// ---------------------------------------------------------------------------
// Core RBAC Evaluation Functions
// ---------------------------------------------------------------------------

/**
 * Checks if the user has at least the specified role in the role hierarchy.
 */
export function hasRole(user: User | null | undefined, minimumRole: UserRole): boolean {
  if (!user || user.isLocked) return false;
  const userRank = ROLE_HIERARCHY[user.role] ?? -1;
  const targetRank = ROLE_HIERARCHY[minimumRole] ?? 999;
  return userRank >= targetRank;
}

/**
 * Checks if the user meets the minimum subscription tier.
 */
export function meetsTierRequirement(
  user: User | null | undefined,
  minimumTier: SubscriptionTier,
): boolean {
  if (!user || user.isLocked) return false;
  const userTierRank = TIER_HIERARCHY[user.subscriptionTier] ?? -1;
  const targetTierRank = TIER_HIERARCHY[minimumTier] ?? 999;
  return userTierRank >= targetTierRank;
}

/**
 * Evaluates whether a user can perform a specific permission-gated action.
 * Requires BOTH:
 * 1. User's role grants the permission.
 * 2. User's subscription tier allows the permission.
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user || user.isLocked) return false;

  // Super admins bypass tier restrictions
  if (user.role === 'super_admin') return true;

  // Check Role permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  const roleAllows = rolePermissions ? rolePermissions.includes(permission) : false;
  if (!roleAllows) return false;

  // Check Subscription Tier permissions
  const tierPermissions = TIER_PERMISSIONS[user.subscriptionTier];
  const tierAllows = tierPermissions ? tierPermissions.includes(permission) : false;

  return tierAllows;
}

/**
 * Evaluates if a user has all of the requested permissions.
 */
export function hasAllPermissions(
  user: User | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((perm) => hasPermission(user, perm));
}

/**
 * Evaluates if a user has at least one of the requested permissions.
 */
export function hasAnyPermission(
  user: User | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((perm) => hasPermission(user, perm));
}
