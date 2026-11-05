require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { scoreMissionAttempt } = require('../src/features/missions/domain/scoring.ts');
const { createDailyLineupService } = require('../src/features/missions/application/daily-lineup.ts');
const { createMissionConfigurationService } = require('../src/features/missions/application/configuration.ts');

async function main() {
  const root = path.join(__dirname, '../src/features');
  let checked = 0;
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { inspect(file); continue; }
      if (!file.endsWith('.ts')) continue;
      const relative = path.relative(root, file).replaceAll('\\', '/');
      const layer = relative.split('/')[1];
      if (!['domain', 'application'].includes(layer)) continue;
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
        if (!statement.moduleSpecifier) continue;
        const target = statement.moduleSpecifier.text;
        const resolved = path.relative(root, path.resolve(path.dirname(file), target)).replaceAll('\\', '/');
        assert(target.startsWith('.'), `${relative}: core imports external dependency ${target}`);
        assert(resolved.startsWith(relative.split('/')[0] + '/') || (layer === 'application' && resolved.split('/')[1] === 'domain'), `${relative}: core crosses feature boundary outside a published domain contract`);
        const allowed = layer === 'domain' ? ['domain'] : ['domain', 'application'];
        assert(allowed.includes(resolved.split('/')[1]), `${relative}: inward dependency rule violated by ${target}`);
      }
      checked++;
    }
  }
  inspect(root);
  const base = { slug: 'trivia', correct: true, skipped: false, baseXp: 100, seconds: 5, hintUsed: false, mistakes: 0, accuracy: 1 };
  for (const [changes, expected] of [
    [{}, 145], [{ hintUsed: true }, 125], [{ seconds: 6 }, 120],
    [{ correct: false }, 0], [{ skipped: true }, -50],
    [{ slug: 'reaction' }, 125], [{ slug: 'sequence' }, 125],
    [{ slug: 'typing', seconds: 10 }, 170], [{ slug: 'typing', seconds: 10, accuracy: .8 }, 80],
    [{ slug: 'typing', hintUsed: true, seconds: 10 }, 120],
    [{ slug: 'card_match', seconds: 20, mistakes: 3 }, 145],
    [{ slug: 'card_match', seconds: 90, mistakes: 100 }, 20],
  ]) assert.equal(scoreMissionAttempt({ ...base, ...changes }).xpEarned, expected);

  const games = ['math', 'trivia', 'memory'].map(id => ({ id, slug: id, name: id }));
  const saved = new Map(); let writes = 0;
  const service = createDailyLineupService({
    find: async (user, date) => saved.get(`${user}:${date}`) ?? null,
    history: async () => [],
    save: async (user, date, ids) => { writes++; saved.set(`${user}:${date}`, ids); },
  });
  const first = await service('2027-01-01', games, 2, 'one');
  assert.deepEqual(await service('2027-01-01', games, 2, 'one'), first);
  assert.equal(writes, 1);
  assert.equal((await service('2027-01-01', games, 1, 'one')).length, 1);
  await service('2027-01-01', games, 1, 'two');
  assert.equal(saved.size, 2);
  await assert.rejects(service('2027-01-01', games, 4, 'one'));
  await assert.rejects(service('2027-01-01', [games[0], games[0]], 1, 'one'));
  let size = 2, active = 3;
  const config = createMissionConfigurationService({ locked: async work => work({
    activeCount: async () => active, missionSize: async () => size,
    setMissionSize: async next => { size = next; },
    setGameStatus: async (id, current) => { if (id === 'stale') return false; active += current ? -1 : 1; return true; },
    setRounds: async id => id !== 'missing',
  }) });
  await config.setSize(3); assert.equal(size, 3);
  await assert.rejects(config.toggleGame('math', true));
  await config.setSize(2); await config.toggleGame('math', true); assert.equal(active, 2);
  await assert.rejects(config.toggleGame('stale', false));
  for (const count of [0, -1, 21, 1.5, NaN]) await assert.rejects(config.setSize(count));
  await config.setRounds('math', 2, 0, 1);
  for (const rounds of [[0,0,0], [-1,1,1], [11,1,1], [1.5,1,1]]) await assert.rejects(config.setRounds('math', ...rounds));
  await assert.rejects(config.setRounds('missing', 1, 1, 1));
  console.log(`Architecture boundaries: ${checked} modules; scoring, saved routes, invalid configuration and stale writes passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
