'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parentPort, workerData } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');

const databaseFile = workerData.databaseFile;
fs.mkdirSync(path.dirname(databaseFile), { recursive: true, mode: 0o700 });
const database = new DatabaseSync(databaseFile);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS records (
    collection TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (collection, record_id)
  );
`);
try { fs.chmodSync(databaseFile, 0o600); } catch { /* Some platforms ignore POSIX modes. */ }

function deriveKey(rawKey) {
  if (!rawKey) return null;
  if (Buffer.isBuffer(rawKey) && rawKey.length === 32) return rawKey;
  if (typeof rawKey === 'string' && /^[0-9a-f]{64}$/i.test(rawKey)) return Buffer.from(rawKey, 'hex');
  return crypto.createHash('sha256').update(String(rawKey)).digest();
}

const encryptionKeyBuffer = deriveKey(workerData.encryptionKey);

function encryptPayload(rawString, key) {
  if (!key) return rawString;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(rawString, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decryptPayload(storedString, key) {
  if (typeof storedString !== 'string' || !storedString.startsWith('enc:v1:')) {
    return storedString;
  }
  if (!key) {
    throw new Error('Encrypted payload found in SQLite database, but no decryption key was configured.');
  }
  const parts = storedString.split(':');
  if (parts.length !== 5) {
    throw new Error('Malformed encrypted payload format.');
  }
  const iv = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const ciphertext = Buffer.from(parts[4], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

const collections = ['organizations', 'users', 'subscriptions', 'pendingCheckouts', 'processedStripeEvents', 'refreshSessions'];
const selectAll = database.prepare('SELECT collection, record_id, payload FROM records');
const deleteCollection = database.prepare('DELETE FROM records WHERE collection = ?');
const insertRecord = database.prepare('INSERT INTO records (collection, record_id, payload) VALUES (?, ?, ?)');

function emptyDatabase() {
  return Object.fromEntries(collections.map((collection) => [collection, []]));
}

function readSnapshot() {
  const snapshot = emptyDatabase();
  for (const row of selectAll.all()) {
    if (collections.includes(row.collection)) {
      const plaintext = decryptPayload(row.payload, encryptionKeyBuffer);
      snapshot[row.collection].push(JSON.parse(plaintext));
    }
  }
  return snapshot;
}

function recordId(collection, record, index) {
  if (collection === 'processedStripeEvents') return String(record);
  return String(record.id || record.sessionId || record.stripeSubscriptionId || `${collection}-${index}`);
}

function writeSnapshot(snapshot) {
  database.exec('BEGIN IMMEDIATE');
  try {
    for (const collection of collections) {
      deleteCollection.run(collection);
      (snapshot[collection] || []).forEach((record, index) => {
        const serialized = JSON.stringify(record);
        const payloadToStore = encryptPayload(serialized, encryptionKeyBuffer);
        insertRecord.run(collection, recordId(collection, record, index), payloadToStore);
      });
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

parentPort.on('message', ({ id, operation, payload }) => {
  try {
    if (operation === 'read') {
      parentPort.postMessage({ id, result: readSnapshot() });
    } else if (operation === 'write') {
      writeSnapshot(payload);
      parentPort.postMessage({ id, result: true });
    } else if (operation === 'backup') {
      const target = payload && payload.destinationFile
        ? path.resolve(payload.destinationFile)
        : path.resolve(path.dirname(databaseFile), `auth-backup-${Date.now()}.sqlite`);
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      if (fs.existsSync(target)) fs.unlinkSync(target);
      const escaped = target.replace(/'/g, "''");
      database.exec(`VACUUM INTO '${escaped}'`);
      try { fs.chmodSync(target, 0o600); } catch { /* Windows may ignore POSIX modes. */ }
      const stats = fs.statSync(target);
      parentPort.postMessage({ id, result: { path: target, size: stats.size, createdAt: new Date().toISOString() } });
    } else if (operation === 'close') {
      database.close();
      parentPort.postMessage({ id, result: true });
    } else {
      throw new Error(`Unknown database operation: ${operation}`);
    }
  } catch (error) {
    parentPort.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
