# irid.ai Timetable Mobile

Expo/React Native timetable planning app with online account authentication and local-first academic data.

## Data model

The app is local-first. Every authenticated account receives its own storage namespace in the native app's private document directory or origin-scoped browser storage. The server-provisioned UET account receives the bundled organization snapshot; every other account receives a separate manual workspace.

- **UET Mardan org data** — a bundled Fall 2026 snapshot mapped from the repository's executable organization import, including departments, semesters, sections, courses, teachers, section assignments, rooms/labs, and explicit room-sharing grants.
- **Manual data** — an empty, user-managed workspace (or an imported JSON backup).

Users cannot switch into another organization's workspace. Registration is followed by one-time organization enrollment, then import or manual setup. Departments, semesters, sections, and later registers unlock only after valid records are explicitly saved. Academic and generated timetable data stays on the device; the server database is limited to accounts, refresh sessions, organization ownership, and required billing state.

The organization import did not contain live enrollment totals. The bundled snapshot therefore starts each section at 30 students, matching the source lab-capacity default, and flags that value for review. This is a scheduling assumption, not a claim about current enrollment.

## Run

Required runtime: Node.js 22.x and pnpm 12.11.2. The repository pins Node 22.23.3 in `.nvmrc`, enforces the Node 22 major through `package.json`, and uses Node 22 in CI and Docker.

```powershell
cd timetable-mobile
pnpm install
pnpm start
```

Copy `.env.example` to `.env`, set a strong `AUTH_JWT_SECRET`, and set `UET_MARDAN_PASSWORD` in the local/deployment secret store to provision the reserved `uetmardan@gmail.com` account. Set `EXPO_PUBLIC_API_URL` to the reachable HTTPS auth server (or `http://localhost:3000` for local web development). Run `pnpm run build:web` followed by `pnpm run serve` for the combined web/API server; during Expo mobile development, keep the API server and Expo dev server running in separate terminals.

Use Expo Go or an Android/iOS simulator. Run `pnpm run check` for type and domain tests.

For a physical phone that cannot reach the computer over LAN, use `pnpm run start:tunnel`, keep the terminal open, and scan the newly generated QR code. Use `pnpm run start:tunnel:clear` only when the Metro cache itself is stale. If ngrok is unstable and both devices share the same private Wi-Fi, use `pnpm run start:lan` to avoid the external tunnel. For a slower phone or first-bundle timeout, use `pnpm run start:mobile`; it serves a smaller minified production-mode bundle over LAN. The phone and computer must still be on the same non-isolated network.

The bundled UET Mardan snapshot is resource-only: it contains scheduling inputs and no generated timetable. The current data revision performs a one-time removal of older locally saved drafts and arrangement history while preserving resource edits. After that migration, new results are created only when the user presses Generate.

## Mobile navigation

Expo Router provides URL/deep-link navigation for onboarding, Workspace, Generate, Timetable, Settings, global search, and every resource register. Setup opens as a visible resource hub. Departments, Semesters, Sections, Courses, Teachers, Assignments, Rooms/Labs, and Teaching Day each have their own route and Back control. Android hardware Back, iOS swipe-back, browser Back, and shared links return predictably without discarding in-memory edits.

The first run introduces the offline workflow and privacy model. Settings includes system/light/dark appearance, optional native haptics, local import/export/reset actions, app version, privacy disclosure, and release notes. App preferences are stored separately from timetable workspaces.

Global search scans only the active local workspace and links directly to a matching resource editor. Pull-to-refresh re-reads local storage; it does not contact a server. Save, import, export, errors, and one-level edit undo use accessible toast feedback without changing page layout.

The product interaction model uses Google Calendar mobile as a reference for schedule hierarchy, visible day switching, chronological agenda rows, and predictable navigation. It does not copy Google branding or assets. The visual system is original to irid.ai and emphasizes calm operational status, explicit recovery, and local-data trust.

Large resource collections use a fixed ten-record page with text search, Previous/Next controls, total counts, and a focused single-record editor. The generated timetable renders only the selected class group and weekday. This keeps the UET Mardan assignment catalog responsive while making source, saved/unsaved state, readiness, borrowed resources, and validation results visible in text as well as color.

## Solver scope

Generation runs offline with bounded, seeded multi-attempt search plus an independent hard-constraint validator. One or more departments can be selected, which keeps large organization runs practical on a phone. It enforces the current manual workflow's session completeness, active weekdays, break/day window, teacher/section/room collision, room type/capacity/borrowing, teacher daily limit, different-day sibling sessions, and section compactness rules. It prioritizes home rooms and teacher time preferences.

Each accepted arrangement receives a canonical fingerprint that ignores transient session IDs and row order. The app remembers up to 5,000 fingerprints and rejects them during later generation requests, so **Generate new arrangement** does not silently return an already accepted combination. If bounded search cannot find an unseen valid result, the current draft is preserved and the app reports that explicitly.

The repository's Python OR-Tools CP-SAT service remains preferable for very large institution-wide datasets because it can prove infeasibility and optimize globally. The mobile app never silently returns a partial timetable: all required sessions must be placed and validated or generation fails with actionable diagnostics.

## Web deployment

Create the production website locally with:

```powershell
pnpm run build:web
```

The static output is written to `dist/`. The configured base path is `/timetable`, matching this repository's GitHub Pages URL:

```text
https://zahir-ahmad9897.github.io/timetable/
```

The workflow in `.github/workflows/deploy-pages.yml` verifies and deploys the site on every push to `main`. For the first deployment, open **Settings -> Pages** in the GitHub repository and select **GitHub Actions** as the source if it is not already enabled.

For Railway or another container host, the included multi-stage `Dockerfile` builds the static export and runs `server.js` with the pinned production dependencies. Set the service root directory to `timetable-mobile`; the server honors Railway's `PORT` and serves both `/timetable` deep links and static assets. Run the same server locally after building with `pnpm run serve`.

The web build stores organization and manual workspaces separately in browser `localStorage`. JSON backups download directly and color timetables open in browser print preview for PDF saving; importing uses the browser file picker. Browser data is specific to the current browser profile and site origin, so export a JSON backup before clearing site data or changing deployment domains.

For structured academic setup in a manual account, choose **Import Excel**. Download the versioned template, complete its required sheets, select the `.xlsx` file, correct any sheet/row/field errors in the staged review, and confirm replacement. The import is parsed locally, is saved atomically with a recovery backup, and invalidates any prior timetable draft.

## Privacy and deployment

All workspace and generated timetable data remains on the device or in the current browser profile unless the user chooses Export. Online builds require the authenticated API configured through `EXPO_PUBLIC_API_URL`; that API stores account, session, organization-ownership, and billing records, but never the academic workspace.

## Enterprise SaaS & Security Architecture

The implemented runtime security boundaries are:

- **Authentication & RBAC (`src/auth/`)**:
  - JWT session lifecycle with proactive refresh (buffer-based rotation)
  - Platform-adaptive secure storage (`expo-secure-store` on iOS/Android; ephemeral in-memory + `sessionStorage` on web; zero `localStorage` token storage)
  - Role hierarchy: `viewer` < `editor` < `admin` < `super_admin` with granular permission checks
  - Declarative route and component guards (`AuthGuard`, `usePermission`, `useRole`)

- **SaaS Subscription & Stripe Billing (`src/subscription/`)**:
  - Tiered plan architecture: **Free Starter** ($0), **Pro Department** ($20/mo or $192/yr), **Enterprise University** ($99/mo)
  - Feature entitlements & quota enforcement (active workspaces, teacher/room quotas, daily solves, bulk workbook import, Excel matrix export)
  - Hosted Stripe Checkout and customer portal integration
  - Interactive pricing UI with annual/monthly savings toggle (`PricingScreen`, route `/pricing`)
  - Paywall component (`SubscriptionGuard`)

- **Data Leakage Prevention (DLP) & Security Loophole Audits (`src/security/`)**:
  - Tested AES-GCM storage utilities (`secureStorage.ts`); workspace files rely on platform-private app storage and account-scoped filenames rather than claiming universal database encryption
  - Automated sensitive field scrubbing (passwords, tokens, credentials, PII) in logs and exports (`dataLeakagePrevention.ts`)
  - Export quota verification and tamper-evident SHA-256 integrity checksums
  - XSS escaping, null-byte filtering, and path traversal defense (`inputValidator.ts`)
  - Sliding-window rate limiter with lockout protection against brute-force attacks (`rateLimiter.ts`)
  - Tamper-evident structured security audit trail (`auditLogger.ts`)

- **Production Containerization & Orchestration**:
  - Hardened multi-stage `Dockerfile` running as unprivileged `node` user with healthcheck monitoring
  - Production `docker-compose.yml` with memory/CPU resource caps and log rotation
  - Hardened `nginx.conf` reverse proxy with TLS 1.3, HTTP/2, Gzip compression, rate limiting zones, and OWASP headers
  - Full documentation suite in [`docs/`](docs/):
    - [`docs/SECURITY.md`](docs/SECURITY.md) — Threat model, DLP & crypto specs
    - [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) — JWT lifecycle & RBAC matrix
    - [`docs/SUBSCRIPTION.md`](docs/SUBSCRIPTION.md) — SaaS monetization & quota guide
    - [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Production operations & container deployment
    - [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md) — REST endpoints & webhook specs
