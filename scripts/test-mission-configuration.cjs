require('./register-typescript.cjs');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const assert = require('node:assert/strict');
const load = Module._load;
Module._load = function (name, ...args) { return name === 'server-only' ? {} : load.call(this, name, ...args); };
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env.local'))));
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local tests only');
const { query, withTransaction } = require('../src/server/database/connection.ts');
const { missionConfiguration, getGameManagement } = require('../src/features/missions/composition.ts');

async function main() {
  try {
    const original = (await query('SELECT daily_game_count,daily_mission_game_ids FROM system_settings WHERE id=1')).rows[0];
    const report = await getGameManagement();
    const games = Object.values(report.groupedGames).flat();
    assert.equal(games.length, (await query('SELECT count(*)::int AS count FROM game_types')).rows[0].count);
    assert.equal(report.activeGames.length, (await query('SELECT count(*)::int AS count FROM game_types WHERE is_active=true')).rows[0].count);
    for (const game of games) assert.equal(Object.values(game.sourceByDifficulty).reduce((a, b) => a + b, 0), game.questionCount, `${game.slug}: difficulty/total mismatch`);
    const rollback = new Error('Expected test rollback');
    await assert.rejects(withTransaction(async () => {
      await missionConfiguration.setSize(report.activeGames.length);
      const game = report.activeGames[0];
      await assert.rejects(missionConfiguration.toggleGame(game.id, true));
      await missionConfiguration.setSize(1);
      await missionConfiguration.setRounds(game.id, 2, 0, 1);
      assert.deepEqual((await query('SELECT easy_rounds,medium_rounds,hard_rounds FROM game_types WHERE id=$1', [game.id])).rows[0], { easy_rounds: 2, medium_rounds: 0, hard_rounds: 1 });
      assert.equal((await query('SELECT daily_game_count FROM system_settings WHERE id=1')).rows[0].daily_game_count, 1);
      if (report.activeGames.length > 1) {
        await missionConfiguration.toggleGame(game.id, true);
        assert.equal((await query('SELECT is_active FROM game_types WHERE id=$1', [game.id])).rows[0].is_active, false);
        await assert.rejects(missionConfiguration.toggleGame(game.id, true));
        await missionConfiguration.toggleGame(game.id, false);
      }
      throw rollback;
    }), error => error === rollback);
    assert.deepEqual((await query('SELECT daily_game_count,daily_mission_game_ids FROM system_settings WHERE id=1')).rows[0], original);
    console.log('PASS live catalog totals/difficulties, settings persistence, capacity guards, stale toggles and rollback. Existing configuration restored.');
  } finally { await global.postgresPool?.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
