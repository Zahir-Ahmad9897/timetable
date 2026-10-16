# Authentication & Authorization Architecture

> **Component**: `src/auth/`  
> **Status**: Security hardening in progress
> **Author**: Senior Systems Engineer

---

## 1. Architectural Overview

The authentication subsystem is server-backed and fail-closed. Scheduling data can remain offline-capable, but identity, session, authorization, and subscription decisions must come from trusted server state.

### Standalone Self-Contained Architecture (Decoupled from FaceRecognition)

**`timetable-mobile` is engineered as a 100% standalone product**, completely independent of the adjacent `FaceRecognition` codebase:
- **No External Auth Microservice**: Timetable does not query, import, or depend on FaceRecognition's backend or auth service.
- **Server API (`server.js`)**: Standalone deployments expose authentication and subscription endpoints. The client never creates a local identity or grants a local subscription when this API is unavailable.
- **Fail-closed client (`src/auth/authService.ts`)**: Login, registration, profile, password, and refresh operations propagate API failures. No embedded client authentication engine or public demo account is shipped.
- **Dedicated UI (`app/auth.tsx` and `src/screens/auth/AuthScreen.tsx`)**: Sign-in and registration collect credentials but do not embed, display, or auto-fill shared credentials.
- **Native API configuration**: Set `EXPO_PUBLIC_API_URL` to the HTTPS backend origin before producing Android or iOS builds. Same-origin web deployments may leave it empty.

> The current JSON-backed server is a transitional deployment baseline, not the final multi-tenant data architecture. Tenant isolation, durable refresh-session storage, server-side RBAC, and production database migration are tracked as required hardening work.


### Dual-Layer Security Model

Every protected action is gated by two independent checks:
1. **Role Layer (RBAC)**: Does the user's role (`viewer`, `editor`, `admin`, `super_admin`) have permission to perform this action?
2. **Subscription Tier Layer**: Does the user's active SaaS tier (`free`, `pro`, `enterprise`) unlock this capability?

```
User Action Triggered
         │
         ▼
┌───────────────────────────────────────┐
│     Layer 1: Role-Based Check         │
│  hasRole(user, minimumRole)?          │
│  rolePermissions.includes(action)?    │
└──────────────────┬────────────────────┘
                   │ Pass
                   ▼
┌───────────────────────────────────────┐
│     Layer 2: Subscription Check       │
│  meetsTierRequirement(user, tier)?   │
│  tierPermissions.includes(action)?    │
└──────────────────┬────────────────────┘
                   │ Pass
                   ▼
       Execute Operation
```

---

## 2. Token Lifecycle & Storage Architecture

### Token Types & Expiry
- **Access Token**: Short-lived JWT (15-minute validity). Passed in the `Authorization: Bearer <token>` header. Contains user claims, role, and tier.
- **Refresh Token**: Long-lived opaque token (30-day validity). Used exclusively to mint fresh access tokens.
- **Proactive Refresh Buffer**: Tokens are automatically refreshed **2 minutes prior to expiration** via background timers to ensure zero session disruption for active users.
- **Server session record**: Only a SHA-256 digest of each refresh token is persisted. Refresh use rotates the token and retires the previous session.
- **Replay response**: Reuse of a rotated refresh token revokes every active session in that token family.
- **Logout**: The access-token session identifier is revoked server-side before local credentials are cleared.
- **JWT configuration**: production requires `AUTH_JWT_SECRET` with at least 32 bytes. Local development may use a process-random ephemeral secret, which intentionally invalidates sessions at restart.

### Platform Storage Strategy
- **Native iOS/Android**: Tokens are encrypted in device hardware keychains via `expo-secure-store`.
- **Web Browsers**: Tokens are kept strictly **in-memory** with a tab-scoped `sessionStorage` fallback. Tokens are **never stored in `localStorage`**, eliminating persistent XSS token theft vectors.

---

## 3. Role Hierarchy & Permissions

### Role Hierarchy
```
super_admin (Rank 3)
     ▲
   admin (Rank 2)
     ▲
  editor (Rank 1)
     ▲
  viewer (Rank 0)
```

### Granular Permission Matrix

| Atomic Permission | Viewer | Editor | Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|
| `workspace:view` | ✅ | ✅ | ✅ | ✅ |
| `workspace:create` | ❌ | ✅ | ✅ | ✅ |
| `workspace:update` | ❌ | ✅ | ✅ | ✅ |
| `workspace:delete` | ❌ | ❌ | ✅ | ✅ |
| `workspace:export` | ❌ | ✅ | ✅ | ✅ |
| `workspace:import` | ❌ | ❌ | ✅ | ✅ |
| `timetable:view` | ✅ | ✅ | ✅ | ✅ |
| `timetable:generate` | ❌ | ✅ | ✅ | ✅ |
| `timetable:customize` | ❌ | ✅ | ✅ | ✅ |
| `timetable:export_pdf` | ✅ | ✅ | ✅ | ✅ |
| `timetable:export_excel` | ❌ | ✅ | ✅ | ✅ |
| `academic:import_excel` | ❌ | ✅ | ✅ | ✅ |
| `audit:view` | ❌ | ❌ | ✅ | ✅ |
| `user:manage` | ❌ | ❌ | ✅ | ✅ |
| `billing:manage` | ❌ | ❌ | ✅ | ✅ |

---

## 4. Developer API & React Hooks

### `useAuth()`
Exposes reactive authentication state and action dispatchers:
```tsx
import { useAuth } from '../src/auth';

function UserProfileWidget() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return <LoginButton />;

  return (
    <View>
      <Text>{user.displayName} ({user.role})</Text>
      <Button label="Sign Out" onPress={logout} />
    </View>
  );
}
```

### `usePermission()` & `useRole()`
For granular conditional UI rendering:
```tsx
import { PERMISSIONS, usePermission, useRole } from '../src/auth';

function AdminToolbar() {
  const canDelete = usePermission(PERMISSIONS.WORKSPACE_DELETE);
  const isAdmin = useRole('admin');

  return (
    <View>
      {canDelete && <DeleteWorkspaceButton />}
      {isAdmin && <AuditLogsButton />}
    </View>
  );
}
```

### `AuthGuard`
Protects entire route subtrees with customizable access denied fallbacks:
```tsx
<AuthGuard minimumRole="editor" minimumTier="pro">
  <AcademicImportScreen />
</AuthGuard>
```

### Protected route policy

| Route boundary | Minimum access |
|---|---|
| Main tab layout, timetable, settings, and search | Authenticated viewer |
| Workspace editors and resource editors | Editor |
| Timetable generation | Editor |
| Academic Excel import | Pro editor |

Unauthenticated navigation is redirected to `/auth` from an effect, so navigation never mutates state during React rendering. These client guards protect the interface and local workflow only. They are not a substitute for server-side authorization on API operations; the server must independently resolve identity, tenant membership, role, and entitlement for every protected request.
