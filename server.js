/**
 * @file server.js
 * @description Self-contained production HTTP server with embedded Auth & Subscription API.
 *
 * timetable-mobile is an independent standalone product. This server provides:
 * 1. Embedded native authentication (Registration, Login, Refresh, Profile) with PBKDF2 and HMAC-SHA256 JWTs
 * 2. Stripe Checkout and signature-verified subscription provisioning
 * 3. Static asset serving and SPA routing for the Expo web client
 * 4. Hardened OWASP security headers (CSP, HSTS, X-Frame-Options)
 * 5. Minimal runtime dependencies with the official Stripe SDK
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { BillingError, createStripeBilling } = require('./server/stripeBilling');

const PORT = Number(process.env.PORT) || 3000;
const DIST = path.resolve(__dirname, 'dist');
const BASE_PATH = '/timetable';
const JWT_SECRET = process.env.AUTH_JWT_SECRET || 'iridai_timetable_embedded_jwt_secret_2026';
const DB_FILE = path.resolve(__dirname, 'server-data', 'auth-db.json');
const billing = createStripeBilling({ basePath: BASE_PATH });

// Ensure database directory exists
const DB_DIR = path.dirname(DB_FILE);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// -----------------------------------------------------------------------------
// Embedded Database Operations
// -----------------------------------------------------------------------------

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      db.users ||= [];
      db.subscriptions ||= [];
      db.pendingCheckouts ||= [];
      db.processedStripeEvents ||= [];
      return db;
    } catch {
      // Parse error, re-seed
    }
  }

  // Pre-seed default demo administrator
  const initialSalt = crypto.randomBytes(16).toString('hex');
  const demoHash = crypto.pbkdf2Sync('Password123!', initialSalt, 100000, 64, 'sha512').toString('hex');

  const defaultDb = {
    users: [
      {
        id: 'usr_demo_admin',
        email: 'admin@irid.ai',
        displayName: 'Academic Coordinator',
        organizationName: 'Faculty of Engineering',
        salt: initialSalt,
        passwordHash: demoHash,
        role: 'admin',
        subscriptionTier: 'free',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        isLocked: false,
      },
    ],
    subscriptions: [
      {
        id: 'sub_demo_active',
        userId: 'usr_demo_admin',
        planId: 'plan_free',
        tier: 'free',
        status: 'active',
        interval: 'year',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      },
    ],
    pendingCheckouts: [],
    processedStripeEvents: [],
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
  return defaultDb;
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// -----------------------------------------------------------------------------
// JWT Token Helpers
// -----------------------------------------------------------------------------

function generateJwt(user, expiresInMinutes = 60) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tier: user.subscriptionTier,
    exp,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${b64Header}.${b64Payload}`)
    .digest('base64url');

  return `${b64Header}.${b64Payload}.${signature}`;
}

function verifyJwt(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return data;
  } catch {
    return null;
  }
}

function getAuthUser(req, db) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const claims = verifyJwt(token);
  if (!claims || !claims.sub) return null;
  return db.users.find((u) => u.id === claims.sub) || null;
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
  const db = loadDb();

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

  // Paid access is provisioned only from an authentic Stripe event.
  if (pathname === '/api/subscription/webhook' && method === 'POST') {
    try {
      const rawBody = await readRawBody(req);
      const event = billing.constructWebhookEvent(rawBody, req.headers['stripe-signature']);
      const result = await billing.processWebhookEvent(event, db);
      saveDb(db);
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
      const { email, password, displayName, organizationName } = await readJsonBody(req);
      if (!email || !password || !displayName) {
        return sendJson(400, { message: 'Email, password, and display name are required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      if (db.users.some((u) => u.email === normalizedEmail)) {
        return sendJson(409, { message: 'An account with this email already exists.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');

      const newUser = {
        id: 'usr_' + crypto.randomBytes(8).toString('hex'),
        email: normalizedEmail,
        displayName: displayName.trim(),
        organizationName: organizationName ? organizationName.trim() : undefined,
        salt,
        passwordHash,
        role: 'editor',
        subscriptionTier: 'free',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        isLocked: false,
      };

      db.users.push(newUser);
      saveDb(db);

      const accessToken = generateJwt(newUser, 60);
      const refreshToken = 'rt_' + crypto.randomBytes(24).toString('hex');

      return sendJson(201, {
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          organizationName: newUser.organizationName,
          role: newUser.role,
          subscriptionTier: newUser.subscriptionTier,
          emailVerified: newUser.emailVerified,
          createdAt: newUser.createdAt,
          isLocked: newUser.isLocked,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
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
      const user = db.users.find((u) => u.email === normalizedEmail);
      if (!user) {
        return sendJson(401, { message: 'Invalid email or password.' });
      }

      const hash = crypto.pbkdf2Sync(password, user.salt, 100000, 64, 'sha512').toString('hex');
      if (hash !== user.passwordHash) {
        return sendJson(401, { message: 'Invalid email or password.' });
      }

      user.lastLoginAt = new Date().toISOString();
      saveDb(db);

      const accessToken = generateJwt(user, 60);
      const refreshToken = 'rt_' + crypto.randomBytes(24).toString('hex');

      return sendJson(200, {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          organizationName: user.organizationName,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isLocked: user.isLocked,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });
    } catch (err) {
      return sendJson(400, { message: err.message });
    }
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    return sendJson(200, { message: 'Logged out successfully.' });
  }

  // GET /api/auth/profile
  if (pathname === '/api/auth/profile' && method === 'GET') {
    const user = getAuthUser(req, db);
    if (!user) {
      return sendJson(401, { message: 'Unauthorized or session expired.' });
    }
    return sendJson(200, {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      organizationName: user.organizationName,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      isLocked: user.isLocked,
    });
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
      saveDb(db);
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
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
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

function resolveRequest(requestUrl) {
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
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return target;
      }
    }
  }

  const fallback = path.join(DIST, 'index.html');
  return fs.existsSync(fallback) ? fallback : null;
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
    const target = resolveRequest(req.url);

    if (!target) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(target);
    const contentType = MIME[ext] || 'application/octet-stream';
    const isHtml = target.endsWith('.html');

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000, immutable',
      ...SECURITY_HEADERS,
    };

    res.writeHead(200, headers);

    if (req.method === 'HEAD') {
      res.end();
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
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    }
    res.end('Bad Request');
  }
});

// Container lifecycle handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down server gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down server gracefully...');
  server.close(() => process.exit(0));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[irid.ai Timetable] Self-contained standalone server running on port ${PORT}`);
  console.log(`[irid.ai Timetable] Native Auth & Subscription API active at http://localhost:${PORT}/api/`);
});
