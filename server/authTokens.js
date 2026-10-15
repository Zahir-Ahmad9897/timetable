const crypto = require('node:crypto');

class TokenError extends Error {
  constructor(message, code = 'INVALID_SESSION') {
    super(message);
    this.name = 'TokenError';
    this.code = code;
  }
}

function intSetting(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createTokenService(options = {}) {
  const secret = options.secret || process.env.AUTH_JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('AUTH_JWT_SECRET is required and must contain at least 32 bytes.');
  }

  const issuer = options.issuer || process.env.AUTH_JWT_ISSUER || 'iridai-timetable';
  const audience = options.audience || process.env.AUTH_JWT_AUDIENCE || 'iridai-timetable-clients';
  const accessSeconds = intSetting(options.accessMinutes || process.env.AUTH_ACCESS_TOKEN_EXPIRY_MINUTES, 15) * 60;
  const refreshSeconds = intSetting(options.refreshDays || process.env.AUTH_REFRESH_TOKEN_EXPIRY_DAYS, 30) * 86400;
  const now = options.now || (() => Math.floor(Date.now() / 1000));
  const randomBytes = options.randomBytes || crypto.randomBytes;

  function sign(user, sessionId) {
    const issuedAt = now();
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscriptionTier,
      sid: sessionId,
      jti: randomBytes(16).toString('hex'),
      iss: issuer,
      aud: audience,
      iat: issuedAt,
      exp: issuedAt + accessSeconds,
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    return { token: `${header}.${payload}.${signature}`, expiresAt: issuedAt + accessSeconds };
  }

  function verify(token) {
    try {
      const parts = String(token || '').split('.');
      if (parts.length !== 3) return null;
      const [encodedHeader, encodedPayload, signature] = parts;
      const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
      if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
      const expected = crypto.createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`).digest();
      const actual = Buffer.from(signature, 'base64url');
      if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
      const claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      const current = now();
      if (!claims.sub || !claims.sid || claims.iss !== issuer || claims.aud !== audience ||
          !Number.isFinite(claims.exp) || claims.exp <= current) return null;
      return claims;
    } catch {
      return null;
    }
  }

  const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

  function issue(user, sessions, familyId) {
    const current = now();
    const rawRefreshToken = 'rt_' + randomBytes(32).toString('base64url');
    const session = {
      id: 'ses_' + randomBytes(16).toString('hex'),
      familyId: familyId || 'fam_' + randomBytes(16).toString('hex'),
      userId: user.id,
      tokenHash: hash(rawRefreshToken),
      createdAt: new Date(current * 1000).toISOString(),
      expiresAt: new Date((current + refreshSeconds) * 1000).toISOString(),
      revokedAt: null,
      replacedBySessionId: null,
    };
    sessions.push(session);
    const access = sign(user, session.id);
    return {
      session,
      tokens: {
        accessToken: access.token,
        refreshToken: rawRefreshToken,
        expiresAt: access.expiresAt,
        expiresIn: accessSeconds,
        tokenType: 'Bearer',
      },
    };
  }

  function rotate(rawToken, users, sessions) {
    const tokenHash = hash(String(rawToken || ''));
    const session = sessions.find((item) => item.tokenHash === tokenHash);
    if (!session) throw new TokenError('Refresh session is invalid.');
    const current = now();
    if (session.revokedAt) {
      for (const item of sessions) {
        if (item.familyId === session.familyId && !item.revokedAt) item.revokedAt = new Date(current * 1000).toISOString();
      }
      throw new TokenError('Refresh token reuse was detected.', 'REFRESH_REUSE_DETECTED');
    }
    if (Date.parse(session.expiresAt) <= current * 1000) {
      session.revokedAt = new Date(current * 1000).toISOString();
      throw new TokenError('Refresh session has expired.', 'SESSION_EXPIRED');
    }
    const user = users.find((item) => item.id === session.userId && !item.isLocked);
    if (!user) throw new TokenError('Account is unavailable.');
    session.revokedAt = new Date(current * 1000).toISOString();
    const replacement = issue(user, sessions, session.familyId);
    session.replacedBySessionId = replacement.session.id;
    return replacement.tokens;
  }

  function revokeSession(sessionId, sessions) {
    const session = sessions.find((item) => item.id === sessionId);
    if (session && !session.revokedAt) session.revokedAt = new Date(now() * 1000).toISOString();
  }

  return { issue, rotate, revokeSession, verify };
}

module.exports = { TokenError, createTokenService };
