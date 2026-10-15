/**
 * @module auth/permissions
 * @description Granular permission definitions and role-to-permission mappings.
 *
 * Implements a defense-in-depth authorization model where every sensitive operation
 * is mapped to a discrete atomic permission string. Roles map to sets of permissions,
 * and subscription tier restrictions act as an additional gate.
 *
 * Architecture note: Pure business logic without side effects.
 */

import { SUBSCRIPTION_TIERS } from '../config/constants';
import { SubscriptionTier, UserRole } from './types';

// ---------------------------------------------------------------------------
// Permission Definitions
// ---------------------------------------------------------------------------

export const PERMISSIONS = {
  // Workspace Permissions
  WORKSPACE_VIEW: 'workspace:view',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_EXPORT: 'workspace:export',
  WORKSPACE_IMPORT: 'workspace:import',

  // Timetable Operations
  TIMETABLE_VIEW: 'timetable:view',
  TIMETABLE_GENERATE: 'timetable:generate',
  TIMETABLE_CUSTOMIZE: 'timetable:customize',
  TIMETABLE_EXPORT_PDF: 'timetable:export_pdf',
  TIMETABLE_EXPORT_EXCEL: 'timetable:export_excel',

  // Academic Import Features
  ACADEMIC_IMPORT_EXCEL: 'academic:import_excel',
  ACADEMIC_IMPORT_UNLIMITED: 'academic:import_unlimited',

  // Security & Audit
  AUDIT_LOG_VIEW: 'audit:view',
  SECURITY_SETTINGS_MANAGE: 'security:manage',

  // Administration & Team
  USER_INVITE: 'user:invite',
  USER_MANAGE: 'user:manage',
  ROLE_ASSIGN: 'role:assign',

  // SaaS Billing & Subscription
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ---------------------------------------------------------------------------
// Role to Permissions Mapping
// ---------------------------------------------------------------------------

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = Object.freeze({
  viewer: Object.freeze([
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.TIMETABLE_EXPORT_PDF,
  ]),

  editor: Object.freeze([
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_CREATE,
    PERMISSIONS.WORKSPACE_UPDATE,
    PERMISSIONS.WORKSPACE_EXPORT,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.TIMETABLE_GENERATE,
    PERMISSIONS.TIMETABLE_CUSTOMIZE,
    PERMISSIONS.TIMETABLE_EXPORT_PDF,
    PERMISSIONS.TIMETABLE_EXPORT_EXCEL,
    PERMISSIONS.ACADEMIC_IMPORT_EXCEL,
  ]),

  admin: Object.freeze([
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_CREATE,
    PERMISSIONS.WORKSPACE_UPDATE,
    PERMISSIONS.WORKSPACE_DELETE,
    PERMISSIONS.WORKSPACE_EXPORT,
    PERMISSIONS.WORKSPACE_IMPORT,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.TIMETABLE_GENERATE,
    PERMISSIONS.TIMETABLE_CUSTOMIZE,
    PERMISSIONS.TIMETABLE_EXPORT_PDF,
    PERMISSIONS.TIMETABLE_EXPORT_EXCEL,
    PERMISSIONS.ACADEMIC_IMPORT_EXCEL,
    PERMISSIONS.ACADEMIC_IMPORT_UNLIMITED,
    PERMISSIONS.AUDIT_LOG_VIEW,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
  ]),

  super_admin: Object.freeze([
    ...Object.values(PERMISSIONS),
  ]),
});

// ---------------------------------------------------------------------------
// Subscription Tier Feature Matrix
// ---------------------------------------------------------------------------

export const TIER_PERMISSIONS: Record<SubscriptionTier, readonly Permission[]> = Object.freeze({
  [SUBSCRIPTION_TIERS.FREE]: Object.freeze([
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_CREATE,
    PERMISSIONS.WORKSPACE_UPDATE,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.TIMETABLE_GENERATE,
    PERMISSIONS.TIMETABLE_EXPORT_PDF,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
  ]),

  [SUBSCRIPTION_TIERS.PRO]: Object.freeze([
    PERMISSIONS.WORKSPACE_VIEW,
    PERMISSIONS.WORKSPACE_CREATE,
    PERMISSIONS.WORKSPACE_UPDATE,
    PERMISSIONS.WORKSPACE_DELETE,
    PERMISSIONS.WORKSPACE_EXPORT,
    PERMISSIONS.WORKSPACE_IMPORT,
    PERMISSIONS.TIMETABLE_VIEW,
    PERMISSIONS.TIMETABLE_GENERATE,
    PERMISSIONS.TIMETABLE_CUSTOMIZE,
    PERMISSIONS.TIMETABLE_EXPORT_PDF,
    PERMISSIONS.TIMETABLE_EXPORT_EXCEL,
    PERMISSIONS.ACADEMIC_IMPORT_EXCEL,
    PERMISSIONS.AUDIT_LOG_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_MANAGE,
  ]),

  [SUBSCRIPTION_TIERS.ENTERPRISE]: Object.freeze([
    ...Object.values(PERMISSIONS),
  ]),
});
