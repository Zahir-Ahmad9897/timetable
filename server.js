const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const DIST = path.resolve(__dirname, 'dist');
const BASE_PATH = '/timetable';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function resolveRequest(requestUrl) {
  const url = new URL(requestUrl || '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === BASE_PATH) pathname = '/';
  else if (pathname.startsWith(`${BASE_PATH}/`)) pathname = pathname.slice(BASE_PATH.length);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidates = [relative, `${relative}.html`, path.join(relative, 'index.html')];
  for (const candidate of candidates) {
    const target = path.resolve(DIST, candidate);
    if ((target === DIST || target.startsWith(`${DIST}${path.sep}`)) && fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  }
  return path.join(DIST, 'index.html');
}

http.createServer((req, res) => {
  try {
    const target = resolveRequest(req.url);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(target)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': target.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(target).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`Serving ${DIST} on port ${PORT}`));

