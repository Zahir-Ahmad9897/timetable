import { getAccessToken } from '../auth/tokenManager';
import { getEnvironmentConfig } from '../config/environment';
import { SubscriptionTier, UserRole } from '../auth/types';

export interface AdminUser {
  id: string; email: string; displayName: string; organizationName?: string; organizationId?: string;
  role: UserRole; subscriptionTier: SubscriptionTier; isLocked: boolean; emailVerified: boolean;
  createdAt: string; lastLoginAt?: string; generationCount: number; activeSessions: number;
}
export interface AdminOverview {
  totals: { users: number; organizations: number; activeSessions: number; paidUsers: number; lockedUsers: number };
  users: AdminUser[];
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const base = getEnvironmentConfig().API_URL.replace(/\/+$/, '');
  const response = await fetch(`${base}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Administrator request failed.');
  return body as T;
}

export const getAdminOverview = () => adminRequest<AdminOverview>('/api/admin/overview');
export const updateAdminUser = (userId: string, updates: { isLocked?: boolean; role?: UserRole; subscriptionTier?: SubscriptionTier; resetGenerationCount?: boolean; revokeSessions?: boolean }) =>
  adminRequest<{ user: AdminUser }>(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify(updates) });
