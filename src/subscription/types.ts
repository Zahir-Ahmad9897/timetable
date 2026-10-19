/**
 * @module subscription/types
 * @description Types for the SaaS subscription, billing, and feature entitlement engine.
 *
 * Modeled after modern SaaS subscription billing (e.g., Stripe Billing, OpenAI ChatGPT Plus):
 * - Tiered feature entitlements
 * - Monthly and annual billing cycles
 * - Invoice history and receipt generation
 * - Stripe customer portal integration
 */

import { SubscriptionTier } from '../auth/types';

export type BillingInterval = 'month' | 'year';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface PlanFeature {
  title: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanQuota {
  maxWorkspaces: number; // -1 for unlimited
  maxDepartments: number;
  maxSemestersPerDepartment: number;
  maxSectionsPerSemester: number;
  maxCourses: number;
  maxTeachers: number;
  maxRooms: number;
  maxAssignments: number;
  maxGenerationsTotal: number;
  maxGenerationsPerDay: number;
  excelExport: boolean;
  academicImport: boolean;
  prioritySupport: boolean;
  ssoEnabled: boolean;
  auditLog: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  description: string;
  badge?: string; // e.g. "Most Popular", "Enterprise Grade"
  price: {
    month: number;
    year: number;
    currency: string;
  };
  quotas: PlanQuota;
  features: PlanFeature[];
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  currentPeriodStart: string; // ISO 8601
  currentPeriodEnd: string; // ISO 8601
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  canceledAt?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
}

export interface CustomerPortalSessionResponse {
  portalUrl: string;
}

export interface SubscriptionContextValue {
  subscription: UserSubscription | null;
  currentPlan: SubscriptionPlan;
  isLoading: boolean;
  error: string | null;
  allPlans: SubscriptionPlan[];
  upgradePlan: (planId: string, interval: BillingInterval) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}
