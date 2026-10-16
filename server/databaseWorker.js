'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parentPort, workerData } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');

const databaseFile = workerData.databaseFile;
fs.mkdirSync(path.dirname(databaseFile), { recursive: true, mode: 0o700 });
const database = new DatabaseSync(databaseFile);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS records (
    collection TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (collection, record_id)
  );
`);
try { fs.chmodSync(databaseFile, 0o600); } catch { /* Some platforms ignore POSIX modes. */ }

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
    if (collections.includes(row.collection)) snapshot[row.collection].push(JSON.parse(row.payload));
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
        insertRecord.run(collection, recordId(collection, record, index), JSON.stringify(record));
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
    if (operation === 'read') parentPort.postMessage({ id, result: readSnapshot() });
    else if (operation === 'write') {
      writeSnapshot(payload);
      parentPort.postMessage({ id, result: true });
    } else if (operation === 'close') {
      database.close();
      parentPort.postMessage({ id, result: true });
    } else throw new Error(`Unknown database operation: ${operation}`);
  } catch (error) {
    parentPort.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
