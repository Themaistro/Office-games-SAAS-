require('./register-typescript.cjs');
const Module = require('node:module'), originalLoad = Module._load;
Module._load = function(name, ...args) { return name === 'server-only' ? {} : originalLoad.call(this, name, ...args); };
const fs = require('node:fs'), assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync('.env.local')));
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local test only');
const { withTransaction } = require('../src/server/database/connection.ts');
const { selectChessGamesForGET, selectChallengeEventsForGET } = require('../src/features/lounge/infrastructure/api-challenges-route-queries.ts');
async function main() {
  const rollback = new Error('Roll back challenge history fixtures');
  try {
    await assert.rejects(withTransaction(async client => {
      const players = [randomUUID(), randomUUID()], game = randomUUID();
      for (const id of players) {
        await client.query('INSERT INTO users(id,email) VALUES($1,$2)', [id, `history-${id}@office.test`]);
        await client.query("INSERT INTO profiles(id,email,full_name) SELECT id,email,'History QA' FROM users WHERE id=$1", [id]);
      }
      for (const [table, first, second] of [['chess_games', 'white_player_id', 'black_player_id'], ['ttt_games', 'x_player_id', 'o_player_id']]) {
        await client.query(`INSERT INTO ${table}(id,${first},${second},status,created_at) VALUES($1,$2,$3,'waiting','2026-11-05T13:45:17.442Z')`, [game, ...players]);
      }
      for (const event of ['created', 'accepted']) {
        await client.query("INSERT INTO challenge_events(game_id,game_type,actor_id,challenger_id,challenged_id,event_type,created_at) VALUES($1,'chess',$2,$2,$3,$4,'2026-11-05T13:45:17.442Z')", [game, ...players, event]);
      }
      const read = async () => [
        ...(await selectChessGamesForGET([players[0]], client)).rows,
        ...(await selectChallengeEventsForGET([players[0]], client)).rows,
      ];
      const rows = await read();
      assert.equal(rows.length, 4, 'Keep the matches and both invite events');
      assert.equal(new Set(rows.map(row => row.history_id)).size, 4, 'Same game/timestamp and cross-game IDs must not collide');
      assert(rows.every(row => typeof row.history_id === 'string' && row.history_id.length));
      assert.deepEqual((await read()).map(row => row.history_id).sort(), rows.map(row => row.history_id).sort(), 'History identity must survive refresh');
      throw rollback;
    }), error => error === rollback);
    console.log('PASS challenge history identities across matching timestamps, game types and refreshes; fixtures rolled back.');
  } finally { await global.postgresPool?.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
