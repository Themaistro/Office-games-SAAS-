require('./register-typescript.cjs');
const Module = require('node:module'), load = Module._load;
Module._load = function(name, ...args) { return name === 'server-only' ? {} : load.call(this, name, ...args); };
const fs = require('node:fs'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync('.env.local')));
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local database only');
const { query, withTransaction } = require('../src/server/database/connection.ts');
const { postgresAnswers } = require('../src/features/missions/infrastructure/postgres-answers.ts');
const { createMissionAnswerer } = require('../src/features/missions/application/answer-session.ts');
const user = randomUUID(), question = randomUUID(), sessions = [];
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function fixture() {
  const session = (await query("INSERT INTO daily_sessions(user_id,date,allowed_duration_seconds) VALUES($1,current_date,600) RETURNING id", [user])).rows[0].id;
  sessions.push(session);
  const attempt = (await query('INSERT INTO session_questions(session_id,question_id,order_index) VALUES($1,$2,0) RETURNING id', [session, question])).rows[0].id;
  return { session, attempt };
}
async function main() {
  try {
    await query('INSERT INTO users(id,email) VALUES($1,$2)', [user, `timer-${user}@office.test`]);
    await query("INSERT INTO profiles(id,email,full_name) SELECT id,email,'Timer QA' FROM users WHERE id=$1", [user]);
    await query("INSERT INTO questions(id,game_type_id,difficulty,content,options,correct_answer,base_xp,is_active) SELECT $1,id,'easy','{}','[]','Correct',100,true FROM game_types WHERE slug='trivia'", [question]);
    for (const mode of ['settled', 'deadline']) {
      const { session, attempt } = await fixture(), locked = deferred(), release = deferred(), validated = deferred();
      const holder = withTransaction(async client => {
        await client.query('SELECT id FROM daily_sessions WHERE id=$1 FOR UPDATE', [session]); locked.resolve();
        await release.promise;
        await client.query(mode === 'settled' ? "UPDATE daily_sessions SET status='expired' WHERE id=$1" : "UPDATE daily_sessions SET created_at=now()-interval '20 minutes' WHERE id=$1", [session]);
      });
      await locked.promise;
      const answer = createMissionAnswerer(postgresAnswers, () => { validated.resolve(); return { correct: true, correctAnswer: 'Correct', mistakes: 0, accuracy: 1 }; });
      const pending = answer(user, attempt, 'Correct', 1);
      try { await validated.promise; } finally { release.resolve(); }
      await holder;
      const result = await pending;
      assert.equal(result.success, false); assert.equal(result.error, 'Mission time has expired');
      assert.equal((await query('SELECT is_completed FROM session_questions WHERE id=$1', [attempt])).rows[0].is_completed, false);
      await query("UPDATE daily_sessions SET status='expired' WHERE id=$1", [session]);
      console.log(`PASS answer waiting on a session lock cannot save after ${mode === 'settled' ? 'settlement' : 'deadline expiry'}`);
    }
    const { attempt } = await fixture(), values = { outcome: 'correct', earnedXp: 100, seconds: 1 };
    const duplicates = await Promise.all([postgresAnswers.complete(attempt, values), postgresAnswers.complete(attempt, values)]);
    assert.equal(duplicates.filter(Boolean).length, 1);
    console.log('PASS simultaneous answer submissions save once');
  } finally {
    await query('DELETE FROM session_questions WHERE session_id=ANY($1::uuid[])', [sessions]);
    await query('DELETE FROM daily_sessions WHERE id=ANY($1::uuid[])', [sessions]);
    await query('DELETE FROM questions WHERE id=$1', [question]);
    await query('DELETE FROM profiles WHERE id=$1', [user]); await query('DELETE FROM users WHERE id=$1', [user]);
    await global.postgresPool?.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
