'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isPasswordHashable,
  normalizeEmail,
  passwordValidationError,
  validateDisplayName,
  validateEmail,
} = require('../authValidation');

test('server authentication input validation', async (t) => {
  await t.test('normalizes and validates realistic email addresses', () => {
    assert.equal(normalizeEmail('  Lecturer@UETMardan.edu.pk '), 'lecturer@uetmardan.edu.pk');
    assert.equal(validateEmail('lecturer@uetmardan.edu.pk'), true);
    assert.equal(validateEmail('not-an-email'), false);
    assert.equal(validateEmail(`${'a'.repeat(250)}@x.com`), false);
  });

  await t.test('rejects empty and oversized names', () => {
    assert.equal(validateDisplayName('  Dr Sadaqat Jan  '), true);
    assert.equal(validateDisplayName('   '), false);
    assert.equal(validateDisplayName('x'.repeat(101)), false);
  });

  await t.test('enforces password complexity and hashing bounds', () => {
    assert.equal(passwordValidationError('StrongPass123!'), null);
    assert.match(passwordValidationError('lowercase1234!'), /uppercase/);
    assert.match(passwordValidationError('A1!'), /at least 12/);
    assert.match(passwordValidationError(`A1!${'x'.repeat(126)}`), /not exceed 128/);
    assert.equal(isPasswordHashable('x'.repeat(128)), true);
    assert.equal(isPasswordHashable('x'.repeat(129)), false);
  });
});
