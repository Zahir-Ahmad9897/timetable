# Authentication & Authorization Architecture

> **Component**: `src/auth/`  
> **Status**: Production Ready  
> **Author**: Senior Systems Engineer

---

## 1. Architectural Overview

The authentication and authorization subsystem wraps around the existing offline-capable application without modifying any core scheduling domain algorithms or local storage adapters.

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
