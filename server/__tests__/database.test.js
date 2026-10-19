'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase } = require('../database');

test('SQLite worker persistence, encryption-at-rest, and backups', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'timetable-db-'));
  const dbFile = path.join(directory, 'auth.sqlite');
  const encryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const database = createDatabase({
    databaseFile: dbFile,
    encryptionKey,
  });

  t.after(async () => {
    await database.close();
    await fs.rm(directory, { recursive: true, force: true });
  });

  await t.test('serializes concurrent account transactions', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, index) => database.transaction(async (snapshot) => {
      snapshot.users.push({ id: `usr_${index}`, email: `user${index}@example.com`, secretPayload: `secret-${index}` });
    })));

    const count = await database.read((snapshot) => snapshot.users.length);
    assert.equal(count, 20);
  });

  await t.test('encrypts sensitive records at rest with AES-256-GCM on disk', async () => {
    // Read raw SQLite and WAL files from disk and assert that plaintext secrets do not appear
    const mainBuffer = await fs.readFile(dbFile).catch(() => Buffer.alloc(0));
    const walBuffer = await fs.readFile(`${dbFile}-wal`).catch(() => Buffer.alloc(0));
    const combined = Buffer.concat([mainBuffer, walBuffer]).toString('latin1');
    assert.doesNotMatch(combined, /secret-0/);
    assert.doesNotMatch(combined, /user0@example\.com/);
    assert.match(combined, /enc:v1:/);
  });

  await t.test('creates consistent atomic backups via VACUUM INTO', async () => {
    const backupFile = path.join(directory, 'backup.sqlite');
    const result = await database.backup(backupFile);
    assert.equal(result.path, backupFile);
    assert.ok(result.size > 0);

    // Verify backup is readable by another database instance
    const backupDb = createDatabase({ databaseFile: backupFile, encryptionKey });
    const count = await backupDb.read((snapshot) => snapshot.users.length);
    assert.equal(count, 20);
    await backupDb.close();
  });
});
