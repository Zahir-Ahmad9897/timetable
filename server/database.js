'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { Worker } = require('node:worker_threads');

function createDatabase(options = {}) {
  const databaseFile = options.databaseFile || process.env.AUTH_DB_FILE || path.resolve(__dirname, '..', 'server-data', 'auth.sqlite');
  const encryptionKey = options.encryptionKey !== undefined
    ? options.encryptionKey
    : (process.env.AUTH_DB_ENCRYPTION_KEY || (process.env.AUTH_JWT_SECRET ? crypto.createHash('sha256').update(`db:${process.env.AUTH_JWT_SECRET}`).digest('hex') : undefined));

  const worker = new Worker(path.resolve(__dirname, 'databaseWorker.js'), {
    workerData: { databaseFile, encryptionKey },
  });
  const pending = new Map();
  let nextId = 1;
  let transactionQueue = Promise.resolve();

  worker.on('message', ({ id, result, error }) => {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    if (error) request.reject(new Error(error));
    else request.resolve(result);
  });
  worker.on('error', (error) => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  });

  function call(operation, payload) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, operation, payload });
    });
  }

  function transaction(callback) {
    const run = async () => {
      const snapshot = await call('read');
      const result = await callback(snapshot);
      await call('write', snapshot);
      return result;
    };
    const result = transactionQueue.then(run, run);
    transactionQueue = result.catch(() => undefined);
    return result;
  }

  async function read(callback) {
    await transactionQueue;
    return callback(await call('read'));
  }

  async function backup(destinationFile) {
    await transactionQueue;
    return call('backup', { destinationFile });
  }

  async function close() {
    await transactionQueue;
    await call('close');
    await worker.terminate();
  }

  return { backup, close, databaseFile, read, transaction };
}

module.exports = { createDatabase };
