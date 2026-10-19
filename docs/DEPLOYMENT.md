# Production Deployment & Operations Manual

> **Scope**: Container orchestration, reverse proxy, TLS, and CI/CD  
> **Status**: Approved for Production Deployment  
> **Author**: Senior DevOps & Infrastructure Engineer

---

## 1. Architecture Overview

```
                      Internet (HTTPS: 443)
                                │
                                ▼
         ┌──────────────────────────────────────────────┐
         │             Nginx Reverse Proxy              │
         │  - TLS Termination (TLSv1.3 / HTTP/2)        │
         │  - Rate Limiting Zones (Auth & General)      │
         │  - Gzip Compression                          │
         │  - OWASP Security Headers (CSP, HSTS)        │
         └──────────────────────┬───────────────────────┘
                                │ Internal Docker Network
                                ▼
         ┌──────────────────────────────────────────────┐
         │       irid.ai Timetable Web Container        │
         │  - Multi-stage Node 20 Alpine                │
         │  - Unprivileged Non-Root User ('node')       │
         │  - Port 3000 / Static SPA + Healthcheck     │
         └──────────────────────────────────────────────┘
```

---

## 2. Environment Configuration

Copy `.env.example` to `.env` on your deployment server:

```bash
cp .env.example .env
chmod 600 .env
```

### Essential Production Variables

| Variable | Description | Example / Recommendation |
|---|---|---|
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | Container internal listening port | `3000` |
| `APP_BASE_URL` | Public canonical URL | `https://timetable.irid.ai` |
| `APP_BASE_PATH` | SPA URL prefix | `/timetable` |
| `AUTH_JWT_SECRET` | 256-bit symmetric secret | High entropy generated via `openssl rand -hex 64` |
| `STRIPE_SECRET_KEY` | Stripe live secret key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe live webhook secret | `whsec_...` |
| `CORS_ALLOWED_ORIGINS` | Permitted origins | `https://timetable.irid.ai` |

---

## 3. Docker Deployment

### Step 1: Building the Container Image

```bash
docker build -t iridai/timetable:latest .
```

### Step 2: Running with Docker Compose

Ensure TLS certificates (`fullchain.pem` and `privkey.pem`) are present in `./certs/`, then start:

```bash
docker-compose up -d
```

### Step 3: Checking Health & Status

```bash
docker ps
docker-compose logs -f timetable-app
```

The container includes a native healthcheck:
```bash
wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1
```

---

## 4. Reverse Proxy & Nginx TLS Hardening

The provided `nginx.conf` sets up:
1. **HTTP to HTTPS Redirection** on port 80.
2. **Rate Limiting**:
   - `auth_limit`: 5 requests/sec with burst of 10 for `/api/auth/`
   - `general_limit`: 30 requests/sec with burst of 50 for general traffic
3. **HTTP/2 & Modern TLS Ciphers**: Restricts to TLSv1.2 and TLSv1.3 with forward secrecy.
4. **HSTS Preload**: Forces browser HTTPS caching for 2 years (`max-age=63072000`).

---

## 5. Security & Maintenance Checklist

- [ ] Secrets never committed to Git (verified by hardened `.gitignore`).
- [ ] Container runs as non-root user (`USER node`).
- [ ] Docker image contains zero development dependencies.
- [ ] Automated health checks active and reporting healthy.
- [ ] Rate limits preventing brute-force login attempts (`rateLimiter.js` + Nginx auth zone).
- [ ] Security audit log rotated with 20MB file caps.
- [ ] Database storage permissions set to `0o700` (directory) and `0o600` (file).

---

## 6. Database Storage Architecture & Operational Safeguards

### Storage Model & Concurrency
The auth and subscription records are persisted using Node's native SQLite engine via a dedicated background worker (`server/databaseWorker.js`), ensuring non-blocking event loop execution:
- **Write-Ahead Logging (WAL)**: `PRAGMA journal_mode = WAL;` allows concurrent readers without blocking writes.
- **Durable Synchronous Writes**: `PRAGMA synchronous = FULL;` guarantees transactional durability to disk.
- **Locking & Busy Strategy**: `PRAGMA busy_timeout = 5000;` ensures queries wait up to 5 seconds before reporting busy, preventing concurrency failures under heavy load.
- **Filesystem Permissions**: The `server-data/` directory is restricted to `0o700` and database files to `0o600` (POSIX mode).

### Encryption at Rest (AES-256-GCM)
Sensitive payload records (users, credentials, refresh session hashes, Stripe event logs) are encrypted at rest using authenticated AES-256-GCM:
- Each record receives a fresh cryptographically random 12-byte IV and a 16-byte authentication tag.
- Configured via `AUTH_DB_ENCRYPTION_KEY` (or derived automatically from `AUTH_JWT_SECRET` in standard configurations).
- Even if host disk images or database files are exfiltrated, records cannot be decrypted without the master key.

### Live Atomic Backups & Disaster Recovery
SQLite provides non-disruptive, live backups via `VACUUM INTO`:
```bash
# Example backup execution via programmatic API:
# database.backup('/var/backups/auth-2026-10-16.sqlite')
```
Recommended cron snapshot schedule:
```cron
# Daily atomic snapshot at 02:00 UTC
0 2 * * * node -e "const { createDatabase } = require('./server/database'); const db = createDatabase(); db.backup('./server-data/backups/backup-' + Date.now() + '.sqlite').then(r => { console.log('Backup created:', r.path); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });"
```

### Scaling Architecture: Standalone vs Multi-Node Clustered
| Dimension | Standalone Mode (Current Implemented) | Multi-Node Clustered (High Availability) |
|---|---|---|
| **Database** | SQLite + WAL + AES-256-GCM encryption | Managed PostgreSQL / AWS Aurora with KMS encryption-at-rest |
| **Rate Limiting** | Process-local with auto-pruning (`rateLimiter.js`) + Nginx zone | Shared Redis / Valkey cluster (`RedisRateLimitAdapter`) |
| **Session Lifecycle** | JWT + refresh hashes in encrypted SQLite | Distributed Redis session registry or PostgreSQL |
| **Load Balancer** | Single Nginx reverse proxy with `TRUST_PROXY=true` | AWS ALB / Cloudflare with TLS termination and healthcheck routing |
