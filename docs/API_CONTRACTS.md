# SaaS Backend API Specifications & Contracts

> **Standard**: RESTful JSON over HTTPS  
> **Authentication**: HTTP Bearer JWT  
> **Status**: Approved Specification  
> **Author**: Senior Systems Architect

---

## 1. Global Conventions

### Base Headers
All authenticated API requests must include:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

### Standard Error Response Schema
```json
{
  "code": "ERROR_CODE_STRING",
  "message": "Human readable message for user feedback",
  "details": {
    "field": "Additional contextual details"
  }
}
```

Standard HTTP status codes:
- `200 OK` / `201 Created`
- `400 Bad Request` (Malformed JSON or validation error)
- `401 Unauthorized` (Missing, invalid, or expired access token)
- `403 Forbidden` (Insufficient role permissions or subscription tier locked)
- `429 Too Many Requests` (Sliding window rate limit exceeded)
- `500 Internal Server Error`

---

## 2. Authentication Endpoints

### `POST /api/auth/register`
Creates a new tenant user account.

**Request Body**:
```json
{
  "email": "chair@engineering.uetmardan.edu.pk",
  "password": "SecurePassword123!",
  "displayName": "Dr. Sarah Khan",
  "organizationName": "UET Mardan Electrical Engineering"
}
```

**Response (201 Created)**:
```json
{
  "user": {
    "id": "usr_9f8b2c",
    "email": "chair@engineering.uetmardan.edu.pk",
    "displayName": "Dr. Sarah Khan",
    "role": "editor",
    "subscriptionTier": "free",
    "emailVerified": false,
    "createdAt": "2026-10-15T12:00:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rt_87a6bf3...",
    "expiresIn": 900
  }
}
```

---

### `POST /api/auth/login`
Authenticates a user and issues token pair.

**Request Body**:
```json
{
  "email": "chair@engineering.uetmardan.edu.pk",
  "password": "SecurePassword123!"
}
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": "usr_9f8b2c",
    "email": "chair@engineering.uetmardan.edu.pk",
    "displayName": "Dr. Sarah Khan",
    "role": "admin",
    "subscriptionTier": "pro",
    "emailVerified": true,
    "createdAt": "2026-10-15T12:00:00Z",
    "lastLoginAt": "2026-10-15T16:00:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rt_87a6bf3...",
    "expiresIn": 900
  }
}
```

---

### `POST /api/auth/refresh`
Exchanges a valid refresh token for a fresh access token.

**Request Body**:
```json
{
  "refreshToken": "rt_87a6bf3..."
}
```

**Response (200 OK)**:
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rt_982bf7a...",
    "expiresIn": 900
  }
}
```

---

## 3. Subscription & Billing Endpoints

### `GET /api/subscription`
Retrieves current tenant subscription status, active tier, and billing interval.

**Response (200 OK)**:
```json
{
  "subscription": {
    "id": "sub_1N892bK",
    "userId": "usr_9f8b2c",
    "planId": "plan_pro",
    "tier": "pro",
    "status": "active",
    "interval": "year",
    "currentPeriodStart": "2026-10-01T00:00:00Z",
    "currentPeriodEnd": "2027-10-01T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "paymentMethod": {
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2028
    }
  }
}
```

---

### `POST /api/subscription/checkout`
Initializes a Stripe Hosted Checkout session.

**Request Body**:
```json
{
  "planId": "plan_pro",
  "interval": "year"
}
```

**Response (200 OK)**:
```json
{
  "sessionId": "cs_live_a1b2c3d4",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_live_a1b2c3d4"
}
```

---

### `POST /api/subscription/portal`
Generates a Stripe Customer Portal session link for card management and invoice downloads.

**Response (200 OK)**:
```json
{
  "portalUrl": "https://billing.stripe.com/p/session/live_portal_123"
}
```
