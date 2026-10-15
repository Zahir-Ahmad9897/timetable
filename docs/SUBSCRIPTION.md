# SaaS Subscription, Billing & Quota Architecture

> **Component**: `src/subscription/`  
> **Status**: Production Ready  
> **Author**: Senior Systems Engineer

---

## 1. Monetization Strategy & Product Tiers

The irid.ai Timetable SaaS platform follows a **subscription-based model** (similar to ChatGPT Plus / Slack Pro / Figma Team):
- **Free Starter**: Self-serve entry point for individual educators and small single-department schedules.
- **Pro Department ($20/mo or $192/yr)**: Targeted at academic department chairs, schedule coordinators, and medium faculties requiring Excel workbook bulk imports, high-speed generation runs, and spreadsheet exports.
- **Enterprise University ($99/mo or Custom)**: Built for dean offices, campus-wide scheduling, SAML/SSO authentication, custom branding, and dedicated SLA.

---

## 2. Plan Comparison & Quota Matrix

| Feature / Limit | Free Starter ($0) | Pro Department ($20/mo) | Enterprise University ($99/mo) |
|---|:---:|:---:|:---:|
| **Target Audience** | Individual teachers | Department chairs & faculties | Entire universities & school networks |
| **Active Workspaces** | 1 | 10 | Unlimited |
| **Max Departments** | 3 | 20 | Unlimited |
| **Max Teachers** | 20 | 200 | Unlimited |
| **Max Rooms** | 15 | 100 | Unlimited |
| **AI Schedule Solves / Day** | 5 | 100 | Unlimited |
| **PDF Timetable Export** | ✅ Included | ✅ High-Res | ✅ White-label & custom branded |
| **Excel (.xlsx) Timetable Export** | ❌ Locked | ✅ Full matrix export | ✅ Full matrix export |
| **Academic Bulk Excel Import** | ❌ Locked | ✅ Multi-sheet parser | ✅ Multi-sheet parser |
| **Tamper-Evident Audit Logs** | ❌ Locked | ✅ Included | ✅ Real-time webhook export |
| **Single Sign-On (SSO / SAML)** | ❌ No | ❌ No | ✅ Okta, Azure AD, Google Workspace |
| **Support SLA** | Community | Priority email & discord | Dedicated account manager & 99.9% uptime |

---

## 3. Stripe Billing Integration Architecture

The client application integrates with **Stripe Billing** through backend orchestration:

```
[PricingScreen / Upgrade Button]
                 │
                 ▼
     POST /api/subscription/checkout
     (Attaches JWT + planId + interval)
                 │
                 ▼
┌──────────────────────────────────────────────┐
│            Stripe Hosted Checkout            │
│  - Credit Card, Apple Pay, Google Pay        │
│  - 3D Secure / SCA 2.0 Compliance            │
│  - Automated Tax & Invoice Receipts          │
└──────────────────────┬───────────────────────┘
                       │ Webhook: checkout.session.completed
                       ▼
┌──────────────────────────────────────────────┐
│           SaaS Backend Provisioning          │
│  - Updates User.subscriptionTier in DB       │
│  - Mints upgraded token or sets entitlements │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
       Client Entitlement Automatically Unlocks
```

### Self-Serve Customer Portal
Subscribers can manage payment methods, download PDF tax receipts, and adjust renewal settings anytime via Stripe Customer Portal (`openCustomerPortal()`).

---

## 4. UI Gating with `<SubscriptionGuard />`

Premium features are guarded using declarative components:

```tsx
import { SubscriptionGuard } from '../src/subscription';

export function AcademicImportRoute() {
  return (
    <SubscriptionGuard
      minimumTier="pro"
      featureName="Academic Workbook Bulk Import"
      description="Unlock full institutional Excel import (.xlsx) with automated schema validation."
    >
      <AcademicWorkbookUploader />
    </SubscriptionGuard>
  );
}
```

If the user is on the Free tier, an aesthetic upgrade card is rendered in-place with a one-click checkout trigger.

---

## 5. Payment-Provisioning Security Invariants

Paid access is fail-closed and server-authoritative:

1. POST /api/subscription/checkout validates the requested plan and interval against server-side Stripe Price IDs.
2. Checkout creates a pending record only. It never changes User.subscriptionTier.
3. The mobile/web client never simulates an upgrade when the network or billing server is unavailable.
4. POST /api/subscription/webhook verifies Stripe-Signature against the exact raw request body with a five-minute tolerance.
5. A checkout event grants access only when it is paid, belongs to the pending user, matches its metadata, and resolves to the allowlisted Stripe Price ID.
6. Processed Stripe event IDs are retained for idempotency, so webhook retries cannot provision twice.
7. Subscription updated/deleted events affect only Stripe subscription IDs already linked by a verified checkout.
8. Legacy local subscription rows without stripeSubscriptionId are preserved for audit but are not accepted as paid billing state.

Required server variables:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRO_MONTHLY_PRICE_ID
- STRIPE_PRO_YEARLY_PRICE_ID
- STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
- STRIPE_ENTERPRISE_YEARLY_PRICE_ID
- APP_BASE_URL

Configure the Stripe webhook endpoint as:

    POST https://YOUR_DOMAIN/api/subscription/webhook

Subscribe only to:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- customer.subscription.updated
- customer.subscription.deleted

Do not expose secret keys or webhook signing secrets through Expo public environment variables or client bundles.
