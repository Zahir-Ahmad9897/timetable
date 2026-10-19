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
      maxSemestersPerDepartment: TIER_LIMITS.free.maxSemestersPerDepartment,
      maxSectionsPerSemester: TIER_LIMITS.free.maxSectionsPerSemester,
      maxCourses: TIER_LIMITS.free.maxCourses,
      maxTeachers: TIER_LIMITS.free.maxTeachers,
      maxRooms: TIER_LIMITS.free.maxRooms,
      maxAssignments: TIER_LIMITS.free.maxAssignments,
      maxGenerationsTotal: TIER_LIMITS.free.maxGenerationsTotal,
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
      { title: 'Up to 5 departments and semesters 1-8', included: true },
      { title: '2 sections per semester and 100 courses', included: true },
      { title: '5 lifetime timetable test runs', included: true, highlight: true },
      { title: 'Standard constraint conflict solver', included: true },
      { title: 'PDF export & offline storage', included: true },
      { title: 'Excel spreadsheet export', included: false },
      { title: 'Academic workbook import within trial limits', included: true },
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
      maxSemestersPerDepartment: TIER_LIMITS.pro.maxSemestersPerDepartment,
      maxSectionsPerSemester: TIER_LIMITS.pro.maxSectionsPerSemester,
      maxCourses: TIER_LIMITS.pro.maxCourses,
      maxTeachers: TIER_LIMITS.pro.maxTeachers,
      maxRooms: TIER_LIMITS.pro.maxRooms,
      maxAssignments: TIER_LIMITS.pro.maxAssignments,
      maxGenerationsTotal: TIER_LIMITS.pro.maxGenerationsTotal,
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
      { title: 'Up to 20 departments & 200 teachers', included: true },
      { title: '100 AI generation runs per day', included: true, highlight: true },
      { title: 'Full Excel workbook import (.xlsx)', included: true, highlight: true },
      { title: 'High-fidelity Excel & PDF export', included: true },
      { title: 'Stripe-hosted billing management', included: true },
      { title: 'SSO and audit logs (planned)', included: false },
    ],
  },
  {
    id: 'plan_enterprise',
    tier: SUBSCRIPTION_TIERS.ENTERPRISE,
    name: 'Mega University',
    tagline: 'Unlimited institution-wide scheduling and testing',
    description: 'Complete institutional governance for universities and school networks.',
    badge: 'MEGA',
    price: {
      month: 99,
      year: 990, // ~17% off billed annually
      currency: 'USD',
    },
    quotas: {
      maxWorkspaces: TIER_LIMITS.enterprise.maxWorkspaces,
      maxDepartments: TIER_LIMITS.enterprise.maxDepartments,
      maxSemestersPerDepartment: TIER_LIMITS.enterprise.maxSemestersPerDepartment,
      maxSectionsPerSemester: TIER_LIMITS.enterprise.maxSectionsPerSemester,
      maxCourses: TIER_LIMITS.enterprise.maxCourses,
      maxTeachers: TIER_LIMITS.enterprise.maxTeachers,
      maxRooms: TIER_LIMITS.enterprise.maxRooms,
      maxAssignments: TIER_LIMITS.enterprise.maxAssignments,
      maxGenerationsTotal: TIER_LIMITS.enterprise.maxGenerationsTotal,
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
      { title: 'Unlimited departments and academic records', included: true, highlight: true },
      { title: 'Unlimited faculty, courses & rooms', included: true, highlight: true },
      { title: 'Unlimited timetable generation', included: true, highlight: true },
      { title: 'Excel import plus Excel and PDF export', included: true },
      { title: 'Protected account administration dashboard', included: true },
      { title: 'SSO, public API, and white-labeling (planned)', included: false },
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
