'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase } = require('../database');

test('SQLite worker serializes concurrent account transactions', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'timetable-db-'));
  const database = createDatabase({ databaseFile: path.join(directory, 'auth.sqlite') });
  t.after(async () => {
    await database.close();
    await fs.rm(directory, { recursive: true, force: true });
  });

  await Promise.all(Array.from({ length: 20 }, (_, index) => database.transaction(async (snapshot) => {
    snapshot.users.push({ id: `usr_${index}`, email: `user${index}@example.com` });
  })));

  const count = await database.read((snapshot) => snapshot.users.length);
  assert.equal(count, 20);
});
