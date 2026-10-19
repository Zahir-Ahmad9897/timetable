# Security Architecture & Data Protection Specification

> **Document Classification**: Confidential / Security Engineering  
> **Author**: Senior Security & Systems Architect  
> **Target Release**: irid.ai Timetable SaaS Platform v1.0  
> **Status**: Engineering design reference; production approval is blocked by the open items in `QA_SAAS_AUDIT.md`.

---

## 1. Executive Summary & Security Philosophy

The **irid.ai Timetable** platform includes several defense-in-depth controls, but it has not been certified for FERPA, GDPR, ISO/IEC 27001, or any other compliance framework. This document describes implemented controls and must not be treated as a compliance attestation.

Because academic scheduling contains institutional resource plans, faculty allocations, room capacities, and student cohort structures, the platform implements multi-layered protections:
1. **Local-First Cryptographic Isolation**: Data is stored and manipulated on-device with zero unsolicited external transmission.
2. **Server Record Encryption**: Authentication and billing records in SQLite can be encrypted with AES-256-GCM. Workspace payloads remain device-local and are not currently encrypted by the workspace storage adapters.
3. **Data Leakage Prevention (DLP)**: Automatic sensitive field scrubbing, quota enforcement, and tamper-evident digital fingerprinting.
4. **Hardened Transport & Server Security**: Full Content Security Policy (CSP), Strict-Transport-Security (HSTS), and HTTP header hardening.

---

## 2. Threat Modeling & OWASP Top 10 Mitigations

| Threat Vector | Severity | Architectural Defense | Implementation Location |
|---|---|---|---|
| **A01: Broken Access Control** | High | Dual-layer RBAC + Subscription Tier Gate. Role hierarchy and entitlement checks enforced at route, provider, and handler boundaries. | `src/auth/rbac.ts`, `src/auth/AuthGuard.tsx` |
| **A02: Cryptographic Failures** | Critical | AES-GCM 256-bit envelope encryption with high-entropy salt and IV generation. High-entropy JWT secrets; SHA-256 PBKDF2 derivation. | `src/security/secureStorage.ts`, `src/auth/tokenManager.ts` |
| **A03: Injection (XSS, SQLi)** | High | HTML entity escaping, non-printable control character filtering, JSON traversal guards, strict path sanitization. | `src/security/inputValidator.ts`, `server.js` |
| **A04: Insecure Design** | Medium | Bounded generation algorithms, strict entity quotas, automated memory and time limits preventing DoS attacks. | `src/config/constants.ts`, `src/domain/generator.ts` |
| **A05: Security Misconfiguration** | High | Frozen runtime configuration validation at startup. Mandatory environment variables. Strict CSP with `frame-ancestors 'none'`. | `src/config/environment.ts`, `src/security/securityHeaders.ts` |
| **A06: Vulnerable Components** | Medium | Multi-stage Docker build, zero extraneous npm dependencies in runtime image, unprivileged container user (`node`). | `Dockerfile`, `package.json` |
| **A07: Identification & Auth Failures** | High | NIST SP 800-63B compliant password policy, exponential sliding-window rate limiting, proactive JWT rotation with buffer. | `src/config/constants.ts`, `src/security/rateLimiter.ts` |
| **A08: Software & Data Integrity** | Medium | Tamper-evident SHA-256 export checksums and metadata attribution preventing undetected tampering of schedule archives. | `src/security/dataLeakagePrevention.ts` |
| **A09: Security Logging & Monitoring** | Low | In-memory and exportable structured audit trail with automated PII and credential redaction. | `src/security/auditLogger.ts` |
| **A10: Server-Side Request Forgery** | Low | Strictly client-side offline execution for schedule solving; static asset proxying only; zero untrusted external URL fetching. | `server.js`, `nginx.conf` |

---

## 3. Data Leakage Prevention (DLP) System

The DLP engine (`src/security/dataLeakagePrevention.ts`) acts as an automated boundary guardian:

```
[User Action / Log / Export]
            │
            ▼
┌──────────────────────────────────────────────┐
│       DLP Redaction & Scrubbing Engine       │
│  - Masks password, secret, token, key, SSN   │
│  - Replaces sensitive fields with [REDACTED] │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           Export Quota Verification          │
│  - Limits departments, teachers, rooms       │
│  - Caps export size to 50MB                  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│      Attribution & Checksum Watermarking     │
│  - Injects organizationId, userId, timestamp │
│  - Computes tamper-evident integrity hash    │
└──────────────────────────────────────────────┘
```

---

## 4. Cryptographic Storage & Key Management

- **Web Platform**: The tested `secureStorage.ts` utility can use `window.crypto.subtle` for AES-GCM protected values. Academic workspaces use account-scoped origin storage and are not described as encrypted at rest.
- **Native Platform (iOS/Android)**: Hardware-backed storage via `expo-secure-store` (Keychain on iOS, Keystore on Android).
- **Session Tokens**: Access tokens are kept strictly in-memory during web sessions and transient `sessionStorage` (never in `localStorage` where XSS could exfiltrate them).

---

## 5. Network & HTTP Security Headers Suite

Production HTTP server (`server.js`) and reverse proxy (`nginx.conf`) enforce:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
Cross-Origin-Resource-Policy: same-origin
X-XSS-Protection: 0
```
