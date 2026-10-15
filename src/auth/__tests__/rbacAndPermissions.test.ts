import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PERMISSIONS, ROLE_PERMISSIONS, TIER_PERMISSIONS } from '../permissions';
import { hasAllPermissions, hasAnyPermission, hasPermission, hasRole, meetsTierRequirement } from '../rbac';
import { decodeToken, isTokenExpired } from '../tokenManager';
import { User } from '../types';

describe('SaaS RBAC and Permission Engine', () => {
  const viewerUser: User = {
    id: 'u_viewer',
    email: 'viewer@university.edu',
    displayName: 'Student Viewer',
    role: 'viewer',
    subscriptionTier: 'free',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    isLocked: false,
  };

  const editorFreeUser: User = {
    id: 'u_editor_free',
    email: 'editor@university.edu',
    displayName: 'Teacher Editor',
    role: 'editor',
    subscriptionTier: 'free',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    isLocked: false,
  };

  const editorProUser: User = {
    id: 'u_editor_pro',
    email: 'editor_pro@university.edu',
    displayName: 'Pro Department Chair',
    role: 'editor',
    subscriptionTier: 'pro',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    isLocked: false,
  };

  const adminEnterpriseUser: User = {
    id: 'u_admin_ent',
    email: 'dean@university.edu',
    displayName: 'Dean of Engineering',
    role: 'admin',
    subscriptionTier: 'enterprise',
    emailVerified: true,
    createdAt: new Date().toISOString(),
    isLocked: false,
  };

  it('enforces role hierarchy correctly', () => {
    assert.equal(hasRole(viewerUser, 'viewer'), true);
    assert.equal(hasRole(viewerUser, 'editor'), false);
    assert.equal(hasRole(editorProUser, 'editor'), true);
    assert.equal(hasRole(editorProUser, 'admin'), false);
    assert.equal(hasRole(adminEnterpriseUser, 'editor'), true);
    assert.equal(hasRole(adminEnterpriseUser, 'admin'), true);
  });

  it('rejects locked accounts regardless of role', () => {
    const lockedUser: User = { ...adminEnterpriseUser, isLocked: true };
    assert.equal(hasRole(lockedUser, 'viewer'), false);
    assert.equal(hasPermission(lockedUser, PERMISSIONS.WORKSPACE_VIEW), false);
  });

  it('enforces subscription tier gating for role-permitted operations', () => {
    // Editor role allows TIMETABLE_EXPORT_EXCEL, but Free tier blocks it
    assert.equal(hasPermission(editorFreeUser, PERMISSIONS.TIMETABLE_EXPORT_EXCEL), false);

    // Editor role + Pro tier unlocks TIMETABLE_EXPORT_EXCEL
    assert.equal(hasPermission(editorProUser, PERMISSIONS.TIMETABLE_EXPORT_EXCEL), true);

    // Editor role allows ACADEMIC_IMPORT_EXCEL on Pro tier
    assert.equal(hasPermission(editorFreeUser, PERMISSIONS.ACADEMIC_IMPORT_EXCEL), false);
    assert.equal(hasPermission(editorProUser, PERMISSIONS.ACADEMIC_IMPORT_EXCEL), true);
  });

  it('evaluates multiple permissions with hasAllPermissions and hasAnyPermission', () => {
    const permissions = [PERMISSIONS.WORKSPACE_VIEW, PERMISSIONS.TIMETABLE_GENERATE] as const;
    assert.equal(hasAllPermissions(editorProUser, permissions), true);
    assert.equal(hasAllPermissions(viewerUser, permissions), false);
    assert.equal(hasAnyPermission(viewerUser, permissions), true);
  });

  it('validates minimum subscription tier requirement', () => {
    assert.equal(meetsTierRequirement(viewerUser, 'free'), true);
    assert.equal(meetsTierRequirement(viewerUser, 'pro'), false);
    assert.equal(meetsTierRequirement(editorProUser, 'pro'), true);
    assert.equal(meetsTierRequirement(editorProUser, 'enterprise'), false);
    assert.equal(meetsTierRequirement(adminEnterpriseUser, 'enterprise'), true);
  });
});

describe('JWT Token Decoding & Expiration Engine', () => {
  it('decodes a standard JWT payload safely without evaluation', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'usr_123',
        email: 'test@irid.ai',
        role: 'editor',
        tier: 'pro',
        exp: Math.floor(Date.now() / 1000) + 900,
        iat: Math.floor(Date.now() / 1000),
        iss: 'iridai',
        aud: 'clients',
        sid: 'sess_1',
      })
    ).toString('base64');
    const sampleToken = `${header}.${payload}.mockSignature`;

    const decoded = decodeToken(sampleToken);
    assert.ok(decoded);
    assert.equal(decoded.sub, 'usr_123');
    assert.equal(decoded.role, 'editor');
    assert.equal(decoded.tier, 'pro');
  });

  it('accurately flags expired and buffer-window tokens', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredPayload = {
      sub: 'usr_1',
      email: 'a@a.com',
      role: 'viewer' as const,
      tier: 'free' as const,
      exp: nowSec - 10,
      iat: nowSec - 1000,
      iss: '',
      aud: '',
      sid: '',
    };
    assert.equal(isTokenExpired(expiredPayload), true);

    const bufferExpiringPayload = {
      ...expiredPayload,
      exp: nowSec + 60, // expires in 1 min, but buffer is 2 mins
    };
    assert.equal(isTokenExpired(bufferExpiringPayload, 2), true);

    const freshPayload = {
      ...expiredPayload,
      exp: nowSec + 600, // expires in 10 mins
    };
    assert.equal(isTokenExpired(freshPayload, 2), false);
  });
});
