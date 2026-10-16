const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

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
  const explicitSecret = Object.prototype.hasOwnProperty.call(options, 'secret');
  let secret = explicitSecret ? options.secret : process.env.AUTH_JWT_SECRET;
  if (!secret && !explicitSecret && process.env.NODE_ENV !== 'production' && options.allowDevelopmentSecret !== false) {
    secret = crypto.randomBytes(48).toString('base64url');
    if (!options.secret) console.warn('[auth] AUTH_JWT_SECRET is missing; using an ephemeral development secret. Sessions reset at restart.');
  }
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
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.subscriptionTier,
      sid: sessionId,
      iat: issuedAt,
      exp: issuedAt + accessSeconds,
    };
    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256', audience, issuer, jwtid: randomBytes(16).toString('hex'),
    });
    return { token, expiresAt: issuedAt + accessSeconds };
  }

  function verify(token) {
    try {
      const claims = jwt.verify(String(token || ''), secret, {
        algorithms: ['HS256'], audience, issuer, clockTimestamp: now(), complete: false,
      });
      if (typeof claims !== 'object' || !claims.sub || !claims.sid) return null;
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
