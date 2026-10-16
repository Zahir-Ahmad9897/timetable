const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('authentication hardening policy', async (t) => {
  await t.test('does not ship the removed embedded authentication engine', () => {
    assert.equal(fs.existsSync(path.join(projectRoot, 'src/auth/embeddedAuthStore.ts')), false);
  });

  await t.test('does not expose the retired shared administrator credentials', () => {
    const productionSources = [
      read('server.js'),
      read('src/auth/authService.ts'),
      read('src/screens/auth/AuthScreen.tsx'),
    ].join('\n');

    assert.doesNotMatch(productionSources, /admin@irid\.ai/i);
    assert.doesNotMatch(productionSources, /Password123!/);
    assert.doesNotMatch(productionSources, /Quick-Fill Demo Administrator/i);
  });

  await t.test('does not silently simulate successful auth operations', () => {
    const authService = read('src/auth/authService.ts');

    assert.doesNotMatch(authService, /fall back to embedded auth/i);
    assert.doesNotMatch(authService, /offline simulated success/i);
    assert.doesNotMatch(authService, /graceful offline no-op/i);
  });

  await t.test('uses transactional persistence, asynchronous password hashing, and a standard JWT library', () => {
    const server = read('server.js');
    const tokens = read('server/authTokens.js');
    assert.doesNotMatch(server, /readFileSync|writeFileSync|pbkdf2Sync/);
    assert.match(server, /createDatabase\(\)/);
    assert.match(server, /promisify\(crypto\.pbkdf2\)/);
    assert.match(tokens, /require\('jsonwebtoken'\)/);
  });

  await t.test('does not permit inline scripts or styles in the web CSP', () => {
    const server = read('server.js');
    const csp = server.match(/'Content-Security-Policy':\s*"([^"]+)"/)?.[1] || '';
    assert.doesNotMatch(csp, /unsafe-inline/);
  });

  await t.test('scopes local workspace storage by authenticated owner', () => {
    for (const storageFile of ['src/storage/workspaceStorage.ts', 'src/storage/workspaceStorage.web.ts']) {
      const source = read(storageFile);
      assert.match(source, /ownerKey/);
      assert.match(source, /safeOwner/);
    }
    assert.match(read('server.js'), /ALREADY_ENROLLED/);
  });

  await t.test('keeps server secrets out of the client bundle and throttles login failures', () => {
    assert.doesNotMatch(read('src/config/environment.ts'), /AUTH_JWT_SECRET/);
    const server = read('server.js');
    assert.match(server, /loginRateState/);
    assert.match(server, /Too many failed sign-in attempts/);
  });

  await t.test('guards every route that exposes workspace data or mutations', () => {
    const guardedRoutes = [
      'app/(tabs)/_layout.tsx',
      'app/(tabs)/generate.tsx',
      'app/(tabs)/workspace.tsx',
      'app/import-academic.tsx',
      'app/resource/[page].tsx',
      'app/search.tsx',
    ];

    for (const route of guardedRoutes) {
      assert.match(read(route), /<AuthGuard(?:\s|>)/, `${route} must render through AuthGuard`);
    }
    assert.match(read('src/auth/AuthGuard.tsx'), /router\.replace\('\/auth'\)/);
    assert.doesNotMatch(read('src/auth/AuthGuard.tsx'), /setTimeout\s*\(/);
  });
});
