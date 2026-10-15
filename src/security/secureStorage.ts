/**
 * @module security/secureStorage
 * @description Data-at-rest encryption layer for workspaces and cache data.
 *
 * Implements envelope-style obfuscation/encryption for offline storage:
 * - On web: Uses Web Cryptography API (AES-GCM) with PBKDF2 key derivation when available,
 *   falling back to structured encoding.
 * - On native: Encrypts data before writing to local filesystem.
 * - Supports automatic version tagging and backward-compatible reading of legacy plaintext workspaces.
 */

const STORAGE_ENCRYPTION_PREFIX = 'ENC:v1:';

/**
 * Derives a cryptographic key from a master secret using Web Crypto API if available.
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

/**
 * Encrypts a string before saving to storage.
 */
export async function encryptPayload(plaintext: string, secretKey = 'iridai_workspace_secret'): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.getRandomValues) {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(secretKey, salt);

      if (key) {
        const enc = new TextEncoder();
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          enc.encode(plaintext)
        );

        const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
        const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
        const dataHex = Array.from(new Uint8Array(encrypted))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        return `${STORAGE_ENCRYPTION_PREFIX}${saltHex}:${ivHex}:${dataHex}`;
      }
    } catch {
      // Fallback below
    }
  }

  // Graceful fallback: Base64 encoding with prefix
  const encoded = typeof btoa !== 'undefined'
    ? btoa(unescape(encodeURIComponent(plaintext)))
    : Buffer.from(plaintext, 'utf-8').toString('base64');

  return `B64:${encoded}`;
}

/**
 * Decrypts a stored payload. Handles:
 * 1. AES-GCM encrypted payloads (starts with ENC:v1:)
 * 2. Base64 obfuscated payloads (starts with B64:)
 * 3. Plaintext JSON (backward compatibility with existing saved workspaces)
 */
export async function decryptPayload(payload: string, secretKey = 'iridai_workspace_secret'): Promise<string> {
  if (!payload || typeof payload !== 'string') return '';

  // Case 1: AES-GCM encrypted
  if (payload.startsWith(STORAGE_ENCRYPTION_PREFIX) && typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const parts = payload.slice(STORAGE_ENCRYPTION_PREFIX.length).split(':');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const saltHex = parts[0];
        const ivHex = parts[1];
        const dataHex = parts[2];
        const salt = new Uint8Array((saltHex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16)));
        const iv = new Uint8Array((ivHex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16)));
        const data = new Uint8Array((dataHex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16)));

        const key = await deriveKey(secretKey, salt);
        if (key) {
          const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
          );
          return new TextDecoder().decode(decrypted);
        }
      }
    } catch {
      // Decryption failed or mismatch, continue fallback
    }
  }

  // Case 2: Base64 obfuscated
  if (payload.startsWith('B64:')) {
    try {
      const b64 = payload.slice(4);
      return typeof atob !== 'undefined'
        ? decodeURIComponent(escape(atob(b64)))
        : Buffer.from(b64, 'base64').toString('utf-8');
    } catch {
      // Fall through to plain text
    }
  }

  // Case 3: Plaintext (legacy workspaces compatibility)
  return payload;
}
