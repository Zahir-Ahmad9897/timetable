const assert = require('node:assert/strict');
const test = require('node:test');
const { TokenError, createTokenService } = require('../authTokens');

const secret = 'a'.repeat(64);
const user = { id: 'usr_1', email: 'owner@example.com', role: 'admin', subscriptionTier: 'pro', isLocked: false };

test('token configuration and refresh lifecycle', async (t) => {
  await t.test('fails closed without a sufficiently strong JWT secret', () => {
    assert.throws(() => createTokenService({ secret: '' }), /AUTH_JWT_SECRET/);
    assert.throws(() => createTokenService({ secret: 'short' }), /at least 32 bytes/);
  });

  await t.test('issues a signed token and stores only a refresh-token hash', () => {
    const sessions = [];
    const service = createTokenService({ secret, now: () => 1_700_000_000 });
    const issued = service.issue(user, sessions);
    const claims = service.verify(issued.tokens.accessToken);
    assert.equal(claims.sub, user.id);
    assert.equal(claims.sid, issued.session.id);
    assert.equal(issued.tokens.expiresAt, 1_700_000_900);
    assert.notEqual(sessions[0].tokenHash, issued.tokens.refreshToken);
    assert.equal(JSON.stringify(sessions).includes(issued.tokens.refreshToken), false);
  });

  await t.test('rotates refresh tokens and detects reuse', () => {
    let current = 1_700_000_000;
    const sessions = [];
    const service = createTokenService({ secret, now: () => current });
    const first = service.issue(user, sessions);
    current += 10;
    const second = service.rotate(first.tokens.refreshToken, [user], sessions);
    assert.notEqual(second.refreshToken, first.tokens.refreshToken);
    assert.equal(sessions[0].replacedBySessionId, sessions[1].id);
    assert.throws(() => service.rotate(first.tokens.refreshToken, [user], sessions),
      (error) => error instanceof TokenError && error.code === 'REFRESH_REUSE_DETECTED');
    assert.ok(sessions.every((session) => session.revokedAt));
  });

  await t.test('revokes a session explicitly on logout', () => {
    const sessions = [];
    const service = createTokenService({ secret });
    const issued = service.issue(user, sessions);
    service.revokeSession(issued.session.id, sessions);
    assert.ok(sessions[0].revokedAt);
  });
});
