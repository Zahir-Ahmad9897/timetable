import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sampleWorkspace } from '../../domain/defaults';
import { prepareSecureExport, scrubSensitiveFields, validateExportPolicy } from '../dataLeakagePrevention';
import {
  escapeHtml,
  sanitizeFilename,
  sanitizeTextInput,
  validateEmail,
  validateImportFile,
  validatePassword,
} from '../inputValidator';
import { checkLoginRateLimit, checkRateLimit, resetRateLimit } from '../rateLimiter';

describe('Data Leakage Prevention (DLP)', () => {
  it('recursively scrubs sensitive fields from log payloads', () => {
    const rawData = {
      id: 'event_1',
      user: {
        email: 'prof@uetmardan.edu.pk',
        password: 'SuperSecretPassword!',
        authToken: 'eyJhbGciOi...',
        apiKey: 'sec_live_98124',
      },
      metadata: {
        creditCardNumber: '4242-4242-4242-4242',
        safeProperty: 'normal_value',
      },
    };

    const scrubbed = scrubSensitiveFields(rawData);
    assert.equal(scrubbed.user.password, '[REDACTED_SENSITIVE]');
    assert.equal(scrubbed.user.authToken, '[REDACTED_SENSITIVE]');
    assert.equal(scrubbed.user.apiKey, '[REDACTED_SENSITIVE]');
    assert.equal(scrubbed.metadata.creditCardNumber, '[REDACTED_SENSITIVE]');
    assert.equal(scrubbed.metadata.safeProperty, 'normal_value');
    assert.equal(scrubbed.user.email, 'prof@uetmardan.edu.pk');
  });

  it('validates workspace export policy quotas', () => {
    const validWs = sampleWorkspace();
    const result = validateExportPolicy(validWs);
    assert.equal(result.valid, true);
  });

  it('generates tamper-evident attribution metadata and checksums', () => {
    const ws = sampleWorkspace();
    const secureExport = prepareSecureExport(ws, {
      userId: 'usr_chair_1',
      organizationId: 'org_engineering',
    });

    assert.ok(secureExport.metadata);
    assert.equal(secureExport.metadata.userId, 'usr_chair_1');
    assert.equal(secureExport.metadata.organizationId, 'org_engineering');
    assert.equal(secureExport.metadata.classification, 'CONFIDENTIAL');
    assert.ok(secureExport.metadata.integrityChecksum.length >= 8);
    assert.equal(secureExport.payload.institutionName, ws.institutionName);
  });
});

describe('Input Validation & Anti-Exploitation', () => {
  it('escapes HTML to mitigate Cross-Site Scripting (XSS)', () => {
    const dangerousInput = '<script>alert("XSS")</script>&<img src=x onerror=alert(1)>';
    const escaped = escapeHtml(dangerousInput);
    assert.ok(!escaped.includes('<script>'));
    assert.ok(!escaped.includes('</script>'));
    assert.ok(escaped.includes('&lt;script&gt;'));
    assert.ok(escaped.includes('&amp;'));
  });

  it('sanitizes filenames against path traversal and null-byte injection', () => {
    const pathTraversal1 = '../../../../etc/passwd';
    const clean1 = sanitizeFilename(pathTraversal1);
    assert.equal(clean1.includes('..'), false);
    assert.equal(clean1.includes('/'), false);
    assert.equal(clean1, 'passwd');

    const nullByteAttack = 'schedule\0.json.exe';
    const clean2 = sanitizeFilename(nullByteAttack);
    assert.equal(clean2.includes('\0'), false);
    assert.equal(clean2, 'schedule.json.exe');
  });

  it('sanitizes text input by trimming and stripping control characters', () => {
    const dirty = '  Valid Department Name \x00\x08\x1F  ';
    const cleaned = sanitizeTextInput(dirty);
    assert.equal(cleaned, 'Valid Department Name');
  });

  it('enforces enterprise password complexity standards', () => {
    // Too short
    assert.equal(validatePassword('Short1!').valid, false);

    // Missing uppercase
    assert.equal(validatePassword('lowercase123!@#').valid, false);

    // Missing number
    assert.equal(validatePassword('NoNumbersHere!@#').valid, false);

    // Missing special character
    assert.equal(validatePassword('NoSpecialChar1234').valid, false);

    // Strong password meeting all NIST criteria
    const strong = validatePassword('ValidSecurePassword2026!');
    assert.equal(strong.valid, true);
    assert.equal(strong.errors.length, 0);
  });

  it('validates email formats with RFC compliance', () => {
    assert.equal(validateEmail('coordinator@uetmardan.edu.pk'), true);
    assert.equal(validateEmail('invalid-email'), false);
    assert.equal(validateEmail('@missing-user.com'), false);
    assert.equal(validateEmail('user@.missing-domain'), false);
  });

  it('validates uploaded file types and size bounds', () => {
    assert.equal(validateImportFile('timetable.xlsx', 1024 * 1024).valid, true);
    assert.equal(validateImportFile('backup.json', 500 * 1024).valid, true);
    assert.equal(validateImportFile('malicious.exe', 100).valid, false);
    assert.equal(validateImportFile('script.js', 100).valid, false);

    // Over maximum size limit (10MB)
    assert.equal(validateImportFile('huge.xlsx', 25 * 1024 * 1024).valid, false);
  });
});

describe('Rate Limiter & Brute-Force Lockout Defense', () => {
  it('permits requests within quota and rejects once threshold is exceeded', () => {
    const key = 'test_rate_client_' + Date.now();
    resetRateLimit(key);

    // Allow 3 requests in 10-second window
    const r1 = checkRateLimit(key, 3, 10000);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);

    const r2 = checkRateLimit(key, 3, 10000);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    const r3 = checkRateLimit(key, 3, 10000);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);

    // 4th request exceeds quota
    const r4 = checkRateLimit(key, 3, 10000);
    assert.equal(r4.allowed, false);
    assert.equal(r4.remaining, 0);
    assert.ok(r4.retryAfterMs > 0);
  });

  it('triggers lockout on excessive failed login attempts', () => {
    const identifier = 'attacker@host.com';
    const key = `auth:login:${identifier}`;
    resetRateLimit(key);

    for (let i = 0; i < 5; i++) {
      const res = checkLoginRateLimit(identifier);
      assert.equal(res.allowed, true);
    }

    // 6th attempt triggers lockout
    const lockoutRes = checkLoginRateLimit(identifier);
    assert.equal(lockoutRes.allowed, false);
    assert.ok(lockoutRes.retryAfterMs > 0);
  });
});
