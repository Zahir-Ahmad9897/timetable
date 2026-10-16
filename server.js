/**
 * @file server.js
 * @description Self-contained HTTP server with Auth & Subscription APIs.
 *
 * timetable-mobile is an independent standalone product. This server provides:
 * 1. Server-enforced authentication (Registration, Login, Refresh, Profile)
 * 2. Stripe Checkout and signature-verified subscription provisioning
 * 3. Static asset serving and SPA routing for the Expo web client
 * 4. Hardened OWASP security headers (CSP, HSTS, X-Frame-Options)
 * 5. Minimal runtime dependencies with the official Stripe SDK
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('node:util');
const { BillingError, createStripeBilling } = require('./server/stripeBilling');
const { TokenError, createTokenService } = require('./server/authTokens');
const { createDatabase } = require('./server/database');

const PORT = Number(process.env.PORT) || 3000;
const DIST = path.resolve(__dirname, 'dist');
const BASE_PATH = '/timetable';
const billing = createStripeBilling({ basePath: BASE_PATH });
const tokenService = createTokenService();
const database = createDatabase();
const derivePassword = promisify(crypto.pbkdf2);
const loginAttempts = new Map();

function loginRateKey(req, email) {
  return `${req.socket.remoteAddress || 'unknown'}:${String(email || '').toLowerCase().trim()}`;
}

function loginRateState(key) {
  const now = Date.now();
  const windowMs = (Number(process.env.AUTH_LOCKOUT_DURATION_MINUTES) || 15) * 60_000;
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + windowMs };
    loginAttempts.set(key, fresh);
    return fresh;
  }
  return current;
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex'), passwordIterations = 210000) {
  const derived = await derivePassword(password, salt, passwordIterations, 64, 'sha512');
  return { salt, passwordHash: derived.toString('hex'), passwordIterations };
}

async function passwordMatches(password, user) {
  const candidate = await derivePassword(password, user.salt, user.passwordIterations || 100000, 64, 'sha512');
  const expected = Buffer.from(user.passwordHash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function publicUser(user) {
  return {
    id: user.id, email: user.email, displayName: user.displayName,
    organizationId: user.organizationId, organizationName: user.organizationName,
    role: user.role, subscriptionTier: user.subscriptionTier,
    emailVerified: user.emailVerified, createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt, isLocked: user.isLocked,
  };
}

// -----------------------------------------------------------------------------
// JWT Token Helpers
// -----------------------------------------------------------------------------

function getAuthContext(req, db) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const claims = tokenService.verify(token);
  if (!claims || !claims.sub) return null;
  const user = db.users.find((u) => u.id === claims.sub && !u.isLocked);
  const session = db.refreshSessions.find((item) => item.id === claims.sid && !item.revokedAt);
  return user && session ? { user, claims, session } : null;
}

function getAuthUser(req, db) {
  return getAuthContext(req, db)?.user || null;
}

// -----------------------------------------------------------------------------
// Request Body Reader
// -----------------------------------------------------------------------------

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    let rejected = false;
    req.on('data', (chunk) => {
      if (rejected) return;
      received += chunk.length;
      if (received > 1024 * 1024) {
        rejected = true;
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!rejected) resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const rawBody = await readRawBody(req);
  if (rawBody.length === 0) return {};
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new Error('Invalid JSON');
  }
}

// -----------------------------------------------------------------------------
// Embedded API Handler
// -----------------------------------------------------------------------------

async function handleApiRequest(req, res, url) {
  const pathname = url.pathname;
  const method = req.method;

  const sendJson = (status, payload) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(payload));
  };

  // Health check
  if (pathname === '/api/health') {
    return sendJson(200, { status: 'healthy', uptime: process.uptime() });
  }

  return database.transaction(async (db) => {

  // Paid access is provisioned only from an authentic Stripe event.
  if (pathname === '/api/subscription/webhook' && method === 'POST') {
    try {
      const rawBody = await readRawBody(req);
      const event = billing.constructWebhookEvent(rawBody, req.headers['stripe-signature']);
      const result = await billing.processWebhookEvent(event, db);
      return sendJson(200, { received: true, duplicate: result.duplicate });
    } catch (error) {
      if (error instanceof BillingError) {
        return sendJson(error.status, { code: error.code, message: error.message });
      }
      console.error('[billing] Stripe webhook processing failed:', error);
      return sendJson(500, {
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: 'Stripe webhook could not be processed.',
      });
    }
  }

  // POST /api/auth/register
  if (pathname === '/api/auth/register' && method === 'POST') {
    try {
      const { email, password, displayName } = await readJsonBody(req);
      if (!email || !password || !displayName) {
        return sendJson(400, { message: 'Email, password, and display name are required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail === (process.env.UET_MARDAN_EMAIL || 'uetmardan@gmail.com').toLowerCase()) {
        return sendJson(403, { message: 'This organization account is provisioned by the server administrator.' });
      }
      if (db.users.some((u) => u.email === normalizedEmail)) {
        return sendJson(409, { message: 'An account with this email already exists.' });
      }
      const minimumLength = Number(process.env.AUTH_PASSWORD_MIN_LENGTH) || 12;
      if (password.length < minimumLength) return sendJson(400, { message: `Password must contain at least ${minimumLength} characters.` });
      const { salt, passwordHash, passwordIterations } = await hashPassword(password);

      const newUser = {
        id: 'usr_' + crypto.randomBytes(8).toString('hex'),
        email: normalizedEmail,
        displayName: displayName.trim(),
        organizationId: undefined,
        organizationName: undefined,
        salt,
        passwordHash,
        passwordIterations,
        role: 'editor',
        subscriptionTier: 'free',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        isLocked: false,
      };

      db.users.push(newUser);
      const { tokens } = tokenService.issue(newUser, db.refreshSessions);
      return sendJson(201, {
        user: publicUser(newUser),
        tokens,
      });
    } catch (err) {
      return sendJson(400, { message: err.message });
    }
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const { email, password } = await readJsonBody(req);
      if (!email || !password) {
        return sendJson(400, { message: 'Email and password are required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const rateKey = loginRateKey(req, normalizedEmail);
      const rateState = loginRateState(rateKey);
      const maximumAttempts = Number(process.env.AUTH_MAX_LOGIN_ATTEMPTS) || 5;
      if (rateState.count >= maximumAttempts) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((rateState.resetAt - Date.now()) / 1000))));
        return sendJson(429, { message: 'Too many failed sign-in attempts. Try again later.' });
      }
      const user = db.users.find((u) => u.email === normalizedEmail);
      if (!user) {
        rateState.count += 1;
        return sendJson(401, { message: 'Invalid email or password.' });
      }

      if (!(await passwordMatches(password, user))) {
        rateState.count += 1;
        return sendJson(401, { message: 'Invalid email or password.' });
      }

      loginAttempts.delete(rateKey);
      if ((user.passwordIterations || 100000) < 210000) Object.assign(user, await hashPassword(password));
      user.lastLoginAt = new Date().toISOString();
      const { tokens } = tokenService.issue(user, db.refreshSessions);
      return sendJson(200, {
        user: publicUser(user),
        tokens,
      });
    } catch (err) {
      return sendJson(400, { message: err.message });
    }
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    const context = getAuthContext(req, db);
    if (context) {
      tokenService.revokeSession(context.claims.sid, db.refreshSessions);
    }
    return sendJson(204, {});
  }

  // POST /api/auth/refresh
  if (pathname === '/api/auth/refresh' && method === 'POST') {
    try {
      const { refreshToken } = await readJsonBody(req);
      if (!refreshToken) return sendJson(400, { code: 'REFRESH_TOKEN_REQUIRED', message: 'Refresh token is required.' });
      const tokens = tokenService.rotate(refreshToken, db.users, db.refreshSessions);
      return sendJson(200, { tokens });
    } catch (error) {
      if (error instanceof TokenError) {
        return sendJson(401, { code: error.code, message: error.message });
      }
      throw error;
    }
  }

  // GET /api/auth/profile
  if (pathname === '/api/auth/profile' && method === 'GET') {
    const user = getAuthUser(req, db);
    if (!user) {
      return sendJson(401, { message: 'Unauthorized or session expired.' });
    }
    return sendJson(200, publicUser(user));
  }

  // Each account may create exactly one organization. The client never sends
  // an organization id, so it cannot enroll into another tenant.
  if (pathname === '/api/auth/enroll' && method === 'POST') {
    const user = getAuthUser(req, db);
    if (!user) return sendJson(401, { message: 'Unauthorized.' });
    if (user.organizationId) return sendJson(409, { code: 'ALREADY_ENROLLED', message: 'This account is already enrolled.' });
    const { organizationName } = await readJsonBody(req);
    const name = String(organizationName || '').trim();
    if (name.length < 2 || name.length > 120) return sendJson(400, { message: 'Organization name must be 2 to 120 characters.' });
    const organization = { id: 'org_' + crypto.randomBytes(12).toString('hex'), name, ownerUserId: user.id, createdAt: new Date().toISOString() };
    db.organizations.push(organization);
    user.organizationId = organization.id;
    user.organizationName = organization.name;
    return sendJson(200, publicUser(user));
  }

  // GET /api/subscription
  if (pathname === '/api/subscription' && method === 'GET') {
    const user = getAuthUser(req, db);
    if (!user) {
      return sendJson(401, { message: 'Unauthorized.' });
    }
    const sub = db.subscriptions.find(
      (subscription) =>
        subscription.userId === user.id && Boolean(subscription.stripeSubscriptionId),
    ) || {
      id: 'sub_default_' + user.id,
      userId: user.id,
      planId: 'plan_free',
      tier: 'free',
      status: 'active',
      interval: 'month',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    };
    return sendJson(200, { subscription: sub });
  }

  // POST /api/subscription/checkout
  if (pathname === '/api/subscription/checkout' && method === 'POST') {
    const user = getAuthUser(req, db);
    if (!user) {
      return sendJson(401, { message: 'Unauthorized.' });
    }
    try {
      const { planId, interval } = await readJsonBody(req);
      const current = db.subscriptions.find(
        (subscription) =>
          subscription.userId === user.id &&
          Boolean(subscription.stripeSubscriptionId) &&
          ['active', 'trialing'].includes(subscription.status) &&
          subscription.tier !== 'free',
      );
      if (current) {
        return sendJson(409, {
          code: 'SUBSCRIPTION_ALREADY_ACTIVE',
          message: 'Use the billing portal to change an active paid subscription.',
        });
      }

      const checkout = await billing.createCheckoutSession(user, planId, interval);
      db.pendingCheckouts.push(checkout.pendingCheckout);
      if (db.pendingCheckouts.length > 1_000) {
        db.pendingCheckouts.splice(0, db.pendingCheckouts.length - 1_000);
      }
      return sendJson(200, {
        sessionId: checkout.sessionId,
        checkoutUrl: checkout.checkoutUrl,
      });
    } catch (error) {
      if (error instanceof BillingError) {
        return sendJson(error.status, { code: error.code, message: error.message });
      }
      console.error('[billing] Stripe checkout creation failed:', error);
      return sendJson(502, {
        code: 'STRIPE_UNAVAILABLE',
        message: 'Secure checkout is temporarily unavailable. No subscription was changed.',
      });
    }
  }

  // Default API fallback
  return sendJson(404, { message: `Endpoint ${pathname} not found.` });
  });
}

// -----------------------------------------------------------------------------
// Static Asset Serving
// -----------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-XSS-Protection': '0',
};

function cspHash(value) {
  return `'sha256-${crypto.createHash('sha256').update(value, 'utf8').digest('base64')}'`;
}

function securityHeaders(html = '') {
  const scriptHashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => cspHash(match[1]));
  const styleHashes = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => cspHash(match[1]));
  const attributeHashes = [...html.matchAll(/\sstyle="([^"]*)"/gi)].map((match) => cspHash(match[1]));
  const unique = (values) => [...new Set(values)].join(' ');
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${unique(scriptHashes)}`.trim(),
    `style-src-elem 'self' https://fonts.googleapis.com ${unique(styleHashes)}`.trim(),
    `style-src-attr 'unsafe-hashes' ${unique(attributeHashes)}`.trim(),
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'",
  ].join('; ') + ';';
  return { ...SECURITY_HEADERS, 'Content-Security-Policy': csp };
}

async function resolveRequest(requestUrl) {
  const url = new URL(requestUrl || '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);

  if (pathname.includes('\0')) {
    return null;
  }

  if (pathname === BASE_PATH) pathname = '/';
  else if (pathname.startsWith(`${BASE_PATH}/`)) pathname = pathname.slice(BASE_PATH.length);

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidates = [relative, `${relative}.html`, path.join(relative, 'index.html')];

  for (const candidate of candidates) {
    const target = path.resolve(DIST, candidate);
    if (target.startsWith(DIST + path.sep) || target === DIST) {
      try { if ((await fs.promises.stat(target)).isFile()) return target; } catch { /* Try the next candidate. */ }
    }
  }

  const fallback = path.join(DIST, 'index.html');
  try { return (await fs.promises.stat(fallback)).isFile() ? fallback : null; } catch { return null; }
}

// -----------------------------------------------------------------------------
// Server Initialization
// -----------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // Handle embedded API endpoints
  if (url.pathname.startsWith('/api/')) {
    try {
      await handleApiRequest(req, res, url);
    } catch {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Internal API Server Error' }));
      }
    }
    return;
  }

  // Method guard for static assets
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }

  try {
    const target = await resolveRequest(req.url);

    if (!target) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders() });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(target);
    const contentType = MIME[ext] || 'application/octet-stream';
    const isHtml = target.endsWith('.html');

    const html = isHtml ? await fs.promises.readFile(target, 'utf8') : '';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
      ...securityHeaders(html),
    };

    res.writeHead(200, headers);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    if (isHtml) {
      res.end(html);
      return;
    }

    fs.createReadStream(target)
      .on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.destroy();
      })
      .pipe(res);
  } catch {
    if (!res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders() });
    }
    res.end('Bad Request');
  }
});

// Container lifecycle handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down server gracefully...');
  server.close(() => { void database.close().finally(() => process.exit(0)); });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down server gracefully...');
  server.close(() => { void database.close().finally(() => process.exit(0)); });
});

async function provisionUetMardanAccount() {
  const email = (process.env.UET_MARDAN_EMAIL || 'uetmardan@gmail.com').toLowerCase();
  const password = process.env.UET_MARDAN_PASSWORD;
  if (!password) {
    console.warn('[auth] UET_MARDAN_PASSWORD is not set; the reserved UET account was not provisioned.');
    return;
  }
  await database.transaction(async (db) => {
    if (db.users.some((user) => user.email === email)) return;
    const { salt, passwordHash, passwordIterations } = await hashPassword(password);
    const organization = {
      id: 'org_uet_mardan', name: 'University of Engineering and Technology, Mardan',
      ownerUserId: 'usr_uet_mardan', createdAt: new Date().toISOString(),
    };
    if (!db.organizations.some((item) => item.id === organization.id)) db.organizations.push(organization);
    db.users.push({
      id: 'usr_uet_mardan', email, displayName: 'UET Mardan',
      organizationId: organization.id, organizationName: organization.name,
      salt, passwordHash, passwordIterations, role: 'admin', subscriptionTier: 'enterprise',
      emailVerified: true, createdAt: new Date().toISOString(), isLocked: false,
    });
  });
}

async function migrateLegacyJsonDatabase() {
  const legacyFile = path.resolve(__dirname, 'server-data', 'auth-db.json');
  let legacy;
  try {
    legacy = JSON.parse(await fs.promises.readFile(legacyFile, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('[database] Legacy JSON database was not migrated:', error.message);
    return;
  }

  await database.transaction(async (snapshot) => {
    const collections = ['users', 'subscriptions', 'pendingCheckouts', 'processedStripeEvents', 'refreshSessions'];
    for (const collection of collections) {
      if (snapshot[collection].length === 0 && Array.isArray(legacy[collection])) {
        snapshot[collection] = legacy[collection].filter((record) => record?.id !== 'usr_demo_admin' && record?.userId !== 'usr_demo_admin');
        if (collection === 'users') snapshot.users = snapshot.users.map((user) => ({ ...user, passwordIterations: user.passwordIterations || 100000 }));
      }
    }
  });
  try { await fs.promises.chmod(legacyFile, 0o600); } catch { /* Windows may ignore POSIX modes. */ }
  console.warn('[database] Imported the retired JSON database into SQLite. Remove the legacy file after verifying the migrated accounts.');
}

async function start() {
  await migrateLegacyJsonDatabase();
  await provisionUetMardanAccount();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[irid.ai Timetable] Self-contained standalone server running on port ${PORT}`);
    console.log(`[irid.ai Timetable] Native Auth & Subscription API active at http://localhost:${PORT}/api/`);
  });
}

void start().catch((error) => {
  console.error('[startup] Server initialization failed:', error);
  void database.close().finally(() => process.exit(1));
});
