require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const { countdownSeconds, challengeClockOrigin } = require('../src/lib/countdown.ts');
const { createMissionFinisher } = require('../src/features/missions/application/finish-session.ts');
const { createMissionAnswerer } = require('../src/features/missions/application/answer-session.ts');
async function main() {
  const start = Date.parse('2026-11-10T12:00:00Z'), end = start + 15000;
  assert.equal(countdownSeconds(end, start), 15);
  assert.equal(countdownSeconds(end, end - 1), 1, 'Do not unlock or expire early');
  assert.equal(countdownSeconds(end, end), 0);
  assert.equal(countdownSeconds(end, end + 3600000), 0, 'Sleep never makes a countdown negative');
  assert.equal(countdownSeconds(end, start + 11001), 4, 'Throttled callbacks catch up to elapsed time');
  assert.equal(countdownSeconds(end, end - 99, 0.1), 0.1);
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(challengeClockOrigin('attempt1', start, storage), start);
  assert.equal(challengeClockOrigin('attempt1', start + 10000, storage), start, 'Navigation/reload preserves the original start');
  assert.equal(challengeClockOrigin('attempt2', start + 10000, storage), start + 10000, 'Separate attempts do not share a timer');
  for (const invalid of ['NaN', '-1', String(start + 999999)]) {
    values.set('challenge-clock:bad', invalid);
    assert.equal(challengeClockOrigin('bad', start, storage), start);
  }
  assert.equal(challengeClockOrigin('blocked', start, { getItem() { throw new Error('blocked'); } }), start);
  const prepEnd = start + 5000, playEnd = prepEnd + 15000;
  assert.equal(countdownSeconds(prepEnd, start + 18000), 0);
  assert.equal(countdownSeconds(playEnd, start + 18000), 2, 'Late prep transition cannot grant a new full play window');
  let now = end - 1, writes = 0;
  const writer = {
    session: { status: 'in_progress', created_at: new Date(start).toISOString(), allowed_duration_seconds: 15, date: '2026-11-10' },
    questions: [{ is_completed: false, earned_xp: 0 }],
    recordTime: async seconds => { assert(seconds >= 0 && seconds <= 15); },
    expire: async () => { writes++; writer.session.status = 'expired'; },
    profile: async () => ({ total_xp: 0, current_streak: 0, current_level: 1 }),
    previousDate: async () => undefined,
    complete: async () => { writes++; writer.session.status = 'completed'; }, activity: async () => {},
  };
  const finish = createMissionFinisher({ locked: async (_id, _user, work) => work(writer) }, () => now);
  assert((await finish('session', 'user')).error, 'Unanswered mission cannot complete');
  assert((await finish('session', 'user', 'expired')).error, 'Early expiry cannot settle');
  now = end;
  assert.equal((await finish('session', 'user', 'expired')).outcome, 'expired');
  await finish('session', 'user', 'expired'); assert.equal(writes, 1, 'Repeated expiry is idempotent');
  writer.session.status = 'in_progress'; writer.questions[0].is_completed = true; writer.questions[0].earned_xp = 100;
  assert.equal((await finish('session', 'user', 'expired')).outcome, 'completed', 'Already-saved final answer wins over simultaneous expiry');
  const row = { user_id: 'user', is_completed: false, session_status: 'in_progress', session_created_at: new Date(start).toISOString(), allowed_duration_seconds: 15 };
  let validated = false;
  const answer = createMissionAnswerer({ find: async () => row, earlierPending: async () => false, complete: async () => { throw new Error('Late answer must not reach persistence'); } }, () => { validated = true; }, () => end);
  assert.equal((await answer('user', 'question', 'answer', 15)).error, 'Mission time has expired');
  assert.equal(validated, false);
  console.log('PASS deadline boundaries, throttled/sleeping clocks, persisted attempt isolation, blocked storage, prep/play timing, early/repeated expiry and final-answer race semantics.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
