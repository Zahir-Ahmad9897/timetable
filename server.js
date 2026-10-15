/**
 * @file server.js
 * @description Hardened Node.js HTTP server for production containerized deployment.
 *
 * Implements:
 * - Enterprise-grade HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Path traversal and null-byte injection defense
 * - HTTP method restriction (GET, HEAD only)
 * - SPA history fallback routing for Expo web router
 * - Graceful container termination (SIGTERM, SIGINT)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const DIST = path.resolve(__dirname, 'dist');
const BASE_PATH = '/timetable';

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

// Hardened production security headers suite
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

  // Null byte injection check
  if (pathname.includes('\0')) {
    return null;
  }

  if (pathname === BASE_PATH) pathname = '/';
  else if (pathname.startsWith(`${BASE_PATH}/`)) pathname = pathname.slice(BASE_PATH.length);

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidates = [relative, `${relative}.html`, path.join(relative, 'index.html')];

  for (const candidate of candidates) {
    const target = path.resolve(DIST, candidate);
    // Path traversal verification: ensure target stays inside DIST
    if (target.startsWith(DIST + path.sep) || target === DIST) {
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return target;
      }
    }
  }

  // SPA fallback
  const fallback = path.join(DIST, 'index.html');
  return fs.existsSync(fallback) ? fallback : null;
}

const server = http.createServer((req, res) => {
  // Method guard: only GET and HEAD allowed for static asset server
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
  console.log(`[irid.ai Timetable] Hardened production server running on port ${PORT}`);
});
