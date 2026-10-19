'use strict';

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 100;
const SPECIAL_CHARACTERS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

function validateDisplayName(value) {
  const displayName = typeof value === 'string' ? value.trim() : '';
  return displayName.length >= MIN_DISPLAY_NAME_LENGTH && displayName.length <= MAX_DISPLAY_NAME_LENGTH;
}

function passwordValidationError(value, minimumLength = 12) {
  if (typeof value !== 'string' || value.length < minimumLength) {
    return `Password must contain at least ${minimumLength} characters.`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || ![...SPECIAL_CHARACTERS].some((character) => value.includes(character))) {
    return 'Password must include uppercase, lowercase, number, and special characters.';
  }
  return null;
}

function isPasswordHashable(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_PASSWORD_LENGTH;
}

module.exports = {
  MAX_PASSWORD_LENGTH,
  isPasswordHashable,
  normalizeEmail,
  passwordValidationError,
  validateDisplayName,
  validateEmail,
};
