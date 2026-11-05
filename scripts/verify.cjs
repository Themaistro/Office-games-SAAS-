const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const commands = [
  ['node_modules/prettier/bin/prettier.cjs', '--check', 'src/**/*.{ts,tsx,css}'],
  ['node_modules/eslint/bin/eslint.js', '.'],
  ['node_modules/typescript/bin/tsc', '--noEmit'],
  ['scripts/test-architecture.cjs'],
  ['scripts/test-platform-structure.cjs'],
  ['scripts/test-question-contracts.cjs'],
  ['scripts/test-profile-presentation.cjs'],
  ['scripts/test-match-recovery.cjs'],
  ['scripts/test-challenge-rules.cjs'],
  ['scripts/test-content-generators.cjs'],
  ['scripts/test-content-history.cjs'],
];
if (process.argv.includes('--database')) commands.push(
  ['scripts/test-cleanup-regressions.cjs'],
  ['scripts/migrate.cjs', '--local'],
  ['scripts/test-company-isolation.cjs'],
  ['scripts/test-schema-contract.cjs'],
  ['scripts/test-database-concurrency.cjs'],
  ['scripts/test-mission-configuration.cjs'],
  ['scripts/test-match-integrity.cjs'],
  ['scripts/test-connect-four-integrity.cjs'],
  ['scripts/test-invitations.cjs'],
  ['scripts/test-parties.cjs'],
);
if (process.argv.includes('--build')) commands.push(['node_modules/next/dist/bin/next', 'build']);
for (const command of commands) {
  console.log('\nChecking:', command[0]);
  const result = spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('\nAll requested verification stages passed.');
