# SaaS QA and Engineering Audit

**Audit date:** 2026-10-16  
**Scope:** Expo web/iOS/Android client, router, timetable domain, imports/exports, authentication, quotas, Stripe billing, administrator console, SQLite persistence, deployment files, automated tests, dependency graph, and product documentation.

## Release decision

The project is suitable for continued controlled testing, but it is **not yet production-ready as a multi-tenant SaaS**. The timetable domain and export logic have useful automated coverage. The main release blockers are device-only workspace persistence, client-only workspace quota enforcement, missing account verification/recovery, single-process backend architecture, and the absence of end-to-end tests and production monitoring.

## Verified baseline

- `pnpm run check`: 49 client/domain tests and 38 server tests pass after this audit pass.
- `pnpm exec expo install --check`: installed packages match Expo SDK 54's expected versions.
- Dependency audit after the safe PostCSS update: 7 transitive advisories remain (4 high, 3 moderate), all currently reached through Expo/Metro/React Native tooling paths.
- `pnpm run build:web`: production export passes and emits 28 static routes, including welcome, contact, auth, pricing, workspace, generation, timetable, and admin routes.
- Isolated HTTP smoke test: invalid registration returns 400; a new Free account consumes runs 0 through 5 and receives 403 on run 6; the provisioned UET account reports Enterprise/Admin and can read the protected admin overview.

## Fixed findings

| ID | Severity | Verified weakness | Correction |
|---|---:|---|---|
| QA-001 | High | Locked accounts could pass password validation and receive a new token pair. | Login now returns `423 ACCOUNT_LOCKED` before session creation; regression coverage added. |
| QA-002 | High | A failed subscription request fabricated an active local Free subscription, overriding authoritative Mega state in the UI. | Removed the simulated billing fallback; the provider now reports the real error and retains server/user entitlement state. |
| QA-003 | High | Stripe `trialing` subscriptions were mapped to `incomplete` and lost paid entitlement. | Trialing is now preserved and entitled on server and client; behavioral webhook test added. |
| QA-004 | High | The pricing UI linked to `/api/subscription/portal`, but the server had no such route. | Added authenticated Stripe Customer Portal creation and hide the action for accounts without a Stripe customer. |
| QA-005 | High | Registration allowed malformed emails, whitespace names, and oversized passwords before PBKDF2 hashing. | Added shared server validation, a 128-character hashing boundary, matching UI validation, and direct tests. |
| QA-006 | High | Pro advertised 100 generations/day while the server treated all paid tiers as unlimited. | Added server policies for Free (5 lifetime), Pro (100/UTC day), and Mega (unlimited), including reset behavior and tests. |
| QA-007 | High | Pricing promised SSO, public APIs, white-labeling, audit logs, support, and SLA features not present in the codebase. | Removed active claims, marked those entitlements unavailable, and kept them below as roadmap work. |
| QA-008 | Moderate | PostCSS was pinned to a version with a published path-disclosure advisory. | Updated the direct dependency and workspace override to 8.5.30. |
| QA-009 | Moderate | Client contexts exposed unused calls to API routes that do not exist. | Removed dead billing and account methods; billing cancellation/invoices remain available through Stripe's hosted portal. |

## Open release blockers

### QA-010 — Workspaces are not SaaS-persisted (High)

`workspaceStorage.web.ts` writes academic data to browser `localStorage`; the native adapter writes JSON into app document storage. The backend stores identities and billing only. Evidence and impact:

- data does not synchronize across a user's devices;
- UET administrators editing bundled data affect only their current device;
- multiple organization members cannot collaborate on one authoritative dataset;
- browser workspace data is plaintext to any script executing on the same origin;
- local owner-key prefixes prevent accidental mixing in the UI but are not a server-side tenant boundary.

**Required improvement:** add versioned server workspace APIs keyed from authenticated `organizationId`/`userId`, optimistic concurrency, backups, tenant authorization tests, and an explicit offline synchronization strategy. Encrypt sensitive server records and document which fields remain on-device.

### QA-011 — Workspace quotas are client-only (High)

Department, semester, section, course, teacher, room, and assignment limits are checked in `WorkspaceProvider`. A user can change browser storage or call domain code directly. Only generation counts are authoritative on the server.

**Required improvement:** enforce workspace limits during server create/update/import operations after QA-010. Never trust tier, role, owner ID, or counts supplied by the client.

### QA-012 — Email ownership and recovery are absent (High)

Registration currently sets `emailVerified: true` without proving mailbox ownership. Password reset, password change, and email verification routes are not implemented. Unsupported client stubs were removed in QA-009 so they cannot appear functional.

**Required improvement:** use expiring, single-use verification/reset tokens stored as hashes; rate-limit issuance and redemption; avoid email enumeration; revoke sessions after credential changes; add UI and mail-provider integration tests.

### QA-013 — Backend concurrency does not scale beyond one process (High)

Every API request enters `database.transaction`, reads the full database snapshot, runs all work (including PBKDF2 and Stripe calls), then rewrites every collection. The queue is in process memory. Consequences include serialized traffic, unnecessary writes for GETs, and lost-update risk if multiple application instances share the database.

**Required improvement:** move to row-level SQL operations and real database transactions, use read-only queries for GET routes, do external Stripe calls outside write transactions, and use PostgreSQL for multi-instance deployment. Keep SQLite only for single-instance testing with a persistent volume.

### QA-014 — Abuse controls are incomplete (High)

Login failures are rate-limited in memory, but registration, refresh, generation consumption, admin mutations, and Stripe session creation have no general endpoint limits. Memory limits reset on restart and are not shared across instances.

**Required improvement:** apply IP plus account limits to sensitive endpoints using a shared store, add request timeouts, log limit events without credentials, and test proxy/IP configuration in the deployment topology.

### QA-015 — Dependency advisories remain (High)

The current audit reports 4 high and 3 moderate transitive advisories involving `image-size`, `node-forge`, `braces`, `uuid`, `decode-uri-component`, and `sprintf-js`. Several advisories currently report no patched version in this dependency tree. Expo's compatibility check says SDK 54 dependencies are internally aligned, so major overrides were not forced.

**Required improvement:** test an Expo SDK upgrade on a dedicated branch, rerun web/Android/iOS builds, and record temporary risk acceptance for build-tool-only paths. Do not suppress the audit output.

### QA-016 — Test coverage is not release-grade (High)

Current tests cover important domain units, but some security tests only search source text. There are no HTTP black-box tests, browser tests, native device tests, accessibility automation, Stripe test-mode end-to-end tests, or coverage thresholds.

**Required improvement:** add API integration tests against a temporary database, Playwright web journeys, Android smoke tests, tenant-isolation tests, import fuzz/size tests, and CI gates for typecheck, tests, build, audit, and migrations.

## Important product gaps

- No error monitoring, structured production logs, alerting, uptime checks, or operational runbook.
- No server audit trail for administrator/billing/security mutations despite audit-related code constants.
- No privacy policy, terms, data-retention/deletion schedule, consent flow, or verified compliance assessment.
- No scheduled encrypted database backup/restore drill.
- No MFA, SSO, invitation/member lifecycle, or organization-level role management.
- No localization; user-facing text and some older documentation contain encoding artifacts that require a separate copy-quality pass.
- No lint/format command or coverage report in CI.

## Recommended implementation order

1. QA-010 and QA-011: authoritative server workspace persistence and tenant/quota enforcement.
2. QA-012 and QA-014: verified email/recovery and distributed abuse controls.
3. QA-013: replace snapshot persistence before adding horizontal scaling.
4. QA-016: HTTP and end-to-end release gates.
5. QA-015: Expo SDK upgrade and dependency risk closure.
6. Monitoring, audit events, legal/privacy work, then SSO/API/branding roadmap features.

## Definition of done for each future fix

Each issue should include a reproducible failing test, the smallest scoped correction, a regression test, updated API/product documentation, `pnpm run check`, a production build, and a short entry in this file. Do not mark a feature available in pricing until its server authorization, UI, failure states, and tests all exist.
