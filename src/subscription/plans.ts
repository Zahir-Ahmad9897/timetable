/**
 * @module subscription/plans
 * @description Catalog of SaaS subscription plans, pricing tiers, and quota entitlements.
 */

import { SUBSCRIPTION_TIERS, TIER_LIMITS } from '../config/constants';
import { SubscriptionPlan } from './types';

export const PLANS: readonly SubscriptionPlan[] = Object.freeze([
  {
    id: 'plan_free',
    tier: SUBSCRIPTION_TIERS.FREE,
    name: 'Free Starter',
    tagline: 'Essential scheduling for individual educators',
    description: 'Perfect for single classrooms and basic schedule generation.',
    price: {
      month: 0,
      year: 0,
      currency: 'USD',
    },
    quotas: {
      maxWorkspaces: TIER_LIMITS.free.maxWorkspaces,
      maxDepartments: TIER_LIMITS.free.maxDepartments,
      maxTeachers: TIER_LIMITS.free.maxTeachers,
      maxRooms: TIER_LIMITS.free.maxRooms,
      maxGenerationsPerDay: TIER_LIMITS.free.maxGenerationsPerDay,
      excelExport: TIER_LIMITS.free.excelExport,
      academicImport: TIER_LIMITS.free.academicImport,
      prioritySupport: TIER_LIMITS.free.prioritySupport,
      ssoEnabled: TIER_LIMITS.free.ssoEnabled,
      auditLog: TIER_LIMITS.free.auditLog,
      customBranding: TIER_LIMITS.free.customBranding,
      apiAccess: TIER_LIMITS.free.apiAccess,
    },
    features: [
      { title: '1 active timetable workspace', included: true },
      { title: 'Up to 3 departments & 20 teachers', included: true },
      { title: 'Standard constraint conflict solver', included: true },
      { title: 'PDF export & offline storage', included: true },
      { title: 'Excel spreadsheet export', included: false },
      { title: 'Academic bulk workbook import', included: false },
      { title: 'Team collaboration & audit logs', included: false },
    ],
  },
  {
    id: 'plan_pro',
    tier: SUBSCRIPTION_TIERS.PRO,
    name: 'Pro Department',
    tagline: 'Advanced AI scheduling for modern academic faculties',
    description: 'Power tools for departments, colleges, and academic planners.',
    badge: 'MOST POPULAR',
    price: {
      month: 20,
      year: 192, // $16/month billed annually (20% off)
      currency: 'USD',
    },
    quotas: {
      maxWorkspaces: TIER_LIMITS.pro.maxWorkspaces,
      maxDepartments: TIER_LIMITS.pro.maxDepartments,
      maxTeachers: TIER_LIMITS.pro.maxTeachers,
      maxRooms: TIER_LIMITS.pro.maxRooms,
      maxGenerationsPerDay: TIER_LIMITS.pro.maxGenerationsPerDay,
      excelExport: TIER_LIMITS.pro.excelExport,
      academicImport: TIER_LIMITS.pro.academicImport,
      prioritySupport: TIER_LIMITS.pro.prioritySupport,
      ssoEnabled: TIER_LIMITS.pro.ssoEnabled,
      auditLog: TIER_LIMITS.pro.auditLog,
      customBranding: TIER_LIMITS.pro.customBranding,
      apiAccess: TIER_LIMITS.pro.apiAccess,
    },
    features: [
      { title: '10 multi-department workspaces', included: true, highlight: true },
      { title: 'Up to 20 departments & 200 teachers', included: true },
      { title: '100 AI generation runs per day', included: true, highlight: true },
      { title: 'Full Excel workbook import (.xlsx)', included: true, highlight: true },
      { title: 'High-fidelity Excel & PDF export', included: true },
      { title: 'Tamper-evident security audit logs', included: true },
      { title: 'Priority email & discord support', included: true },
    ],
  },
  {
    id: 'plan_enterprise',
    tier: SUBSCRIPTION_TIERS.ENTERPRISE,
    name: 'Enterprise University',
    tagline: 'Institution-wide orchestration, compliance & SLA',
    description: 'Complete institutional governance for universities and school networks.',
    badge: 'ENTERPRISE',
    price: {
      month: 99,
      year: 990, // ~17% off billed annually
      currency: 'USD',
    },
    quotas: {
      maxWorkspaces: TIER_LIMITS.enterprise.maxWorkspaces,
      maxDepartments: TIER_LIMITS.enterprise.maxDepartments,
      maxTeachers: TIER_LIMITS.enterprise.maxTeachers,
      maxRooms: TIER_LIMITS.enterprise.maxRooms,
      maxGenerationsPerDay: TIER_LIMITS.enterprise.maxGenerationsPerDay,
      excelExport: TIER_LIMITS.enterprise.excelExport,
      academicImport: TIER_LIMITS.enterprise.academicImport,
      prioritySupport: TIER_LIMITS.enterprise.prioritySupport,
      ssoEnabled: TIER_LIMITS.enterprise.ssoEnabled,
      auditLog: TIER_LIMITS.enterprise.auditLog,
      customBranding: TIER_LIMITS.enterprise.customBranding,
      apiAccess: TIER_LIMITS.enterprise.apiAccess,
    },
    features: [
      { title: 'Unlimited workspaces & departments', included: true, highlight: true },
      { title: 'Unlimited faculty, courses & rooms', included: true, highlight: true },
      { title: 'Unlimited AI timetable generation', included: true, highlight: true },
      { title: 'SAML / OAuth2 Single Sign-On (SSO)', included: true, highlight: true },
      { title: 'Full REST API & webhook integrations', included: true },
      { title: 'White-label custom institutional branding', included: true },
      { title: 'Dedicated account manager & 99.9% SLA', included: true },
    ],
  },
]);

/**
 * Returns a plan by its tier name.
 */
export function getPlanByTier(tier: string): SubscriptionPlan {
  const found = PLANS.find((p) => p.tier === tier);
  return found || (PLANS[0] as SubscriptionPlan);
}

/**
 * Returns a plan by its ID.
 */
export function getPlanById(planId: string): SubscriptionPlan {
  const found = PLANS.find((p) => p.id === planId);
  return found || (PLANS[0] as SubscriptionPlan);
}

