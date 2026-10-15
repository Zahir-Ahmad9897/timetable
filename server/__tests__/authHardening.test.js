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
});
