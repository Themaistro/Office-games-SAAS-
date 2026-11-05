require('./register-typescript.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env.local'))));
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local database tests only');
process.env.DATABASE_POOL_MAX = '2';
const { query, withDatabaseLock, withTransaction } = require('../src/server/database/connection.ts');

async function main() {
  const timings = [], start = performance.now();
  try {
    await Promise.all(Array.from({ length: 24 }, (_, i) => {
      const began = performance.now();
      return withDatabaseLock(`architecture-qa:${i}`, async () => {
        const pid = (await query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
        await withTransaction(async client => {
          assert.equal((await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid, pid);
          assert.equal((await query('SELECT pg_backend_pid() AS pid')).rows[0].pid, pid);
          await assert.rejects(withTransaction(async () => { await query('SELECT 1/0'); }));
          assert.equal((await query('SELECT 42 AS answer')).rows[0].answer, 42);
        });
        await query('SELECT pg_sleep(0.01)');
        timings.push(performance.now() - began);
      });
    }));
    let inFlight = 0;
    await Promise.all(Array.from({ length: 8 }, () => withDatabaseLock('architecture-qa:shared', async () => {
      assert.equal(++inFlight, 1);
      try { await query('SELECT pg_sleep(0.01)'); } finally { inFlight--; }
    })));
    await assert.rejects(withDatabaseLock('architecture-qa:failure', async () => { throw new Error('Expected failure'); }));
    await withDatabaseLock('architecture-qa:failure', async () => { await query('SELECT 1'); });
    await assert.rejects(withTransaction(async () => {
      await query('CREATE TEMP TABLE architecture_rollback_probe (id int)');
      throw new Error('Expected rollback');
    }));
    assert.equal((await query("SELECT to_regclass('pg_temp.architecture_rollback_probe') AS probe")).rows[0].probe, null);
    timings.sort((a, b) => a - b);
    console.log(JSON.stringify({ requests: 24, poolConnections: 2, queuedRequestP95Ms: Math.round(timings[Math.ceil(timings.length * .95) - 1]), totalMs: Math.round(performance.now() - start), checks: 'connection reuse, queued locks, mutual exclusion, failure cleanup, nested rollback, outer rollback' }));
  } finally { await global.postgresPool?.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
