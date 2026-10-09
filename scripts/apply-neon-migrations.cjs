const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
const files = [
  'db/local/001_init.sql',
  'db/migrations/schema.sql',
  'db/local/002_identity.sql',
  'db/local/003_application_tables.sql',
  'db/migrations/migration.sql',
  'db/migrations/migration2.sql',
  'db/migrations/migration3_departments.sql',
  'db/migrations/migration4_announcements_tier1.sql',
  'db/migrations/migration5_company_trivia.sql',
  'db/migrations/migration6_security_hardening.sql',
  'db/migrations/migration7_runtime_schema_reconciliation.sql',
  'db/migrations/migration8_question_history.sql',
  'db/migrations/migration9_question_pool_date.sql',
  'db/migrations/migration9_connect_four.sql',
  'db/migrations/migration10_game_spectators.sql',
  'db/migrations/fix_rls_policies.sql',
  'db/migrations/fix_questions_rls.sql',
  'db/migrations/migration11_game_rounds.sql',
  'db/migrations/migration12_direct_messages.sql',
  'db/migrations/migration13_challenge_events.sql',
  'db/migrations/migration14_chess_events.sql',
  'db/migrations/migration15_lounge_ranks.sql',
  'db/migrations/migration16_lounge_integrity.sql',
  'db/seeds/seed_data.sql',
  'db/seeds/wave1_seed.sql',
  'db/seeds/fun_games_seed.sql',
  'db/seeds/more_questions.sql',
  'db/seeds/mega_seed.sql',
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    for (const relative of files) {
      let sql = fs.readFileSync(path.join(root, relative), 'utf8');
      sql = sql.replace(/^\\i .*$/gm, '');
      process.stdout.write(`Applying ${relative}...\n`);
      await client.query(sql);
    }
    const result = await client.query("select count(*)::int as tables from information_schema.tables where table_schema = 'public'");
    const seeded = await client.query('select count(*)::int as questions from public.questions');
    process.stdout.write(`Done. public tables: ${result.rows[0].tables}; questions: ${seeded.rows[0].questions}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
