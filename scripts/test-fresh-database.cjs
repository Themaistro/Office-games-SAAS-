const { Client } = require('pg'), { randomBytes } = require('node:crypto'), { spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(root, '.env.local'))));
if(fs.existsSync(path.join(root,'.env.migrations.local')))Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(root,'.env.migrations.local'))));
async function main() {
  const url = new URL(process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL);
  if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Fresh database rehearsal is local only');
  const suffix = randomBytes(5).toString('hex');
  const name = 'office_games_schema_qa_' + suffix, role = 'office_qa_' + suffix;
  assert(/^office_games_schema_qa_[a-f0-9]{10}$/.test(name));
  const admin = new Client({ connectionString: url.toString() }); await admin.connect();
  let created = false;
  try {
    await admin.query(`CREATE DATABASE "${name}"`); created = true;
    url.pathname = '/' + name;
    const password=randomBytes(32).toString('hex');
    const env = { ...process.env, DATABASE_URL: url.toString(), MIGRATION_DATABASE_URL: url.toString(), RUNTIME_DATABASE_ROLE: role, RUNTIME_DATABASE_PASSWORD: password };
    for (const file of ['scripts/bootstrap.cjs','scripts/migrate.cjs','scripts/migrate.cjs','scripts/seed-content.cjs','scripts/seed-content.cjs','scripts/provision-company.cjs','scripts/provision-runtime-role.cjs']) {
      const result = spawnSync(process.execPath, [file], { cwd: root, env, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${file} failed`);
    }
    const test = new Client({ connectionString: url.toString() }); await test.connect();
    try {
      assert.equal(Number((await test.query('SELECT count(*) AS count FROM schema_migrations')).rows[0].count), JSON.parse(fs.readFileSync(path.join(root,'db/runtime-migrations.json'))).length);
      assert.equal((await test.query('SELECT company_id FROM deployment_identity WHERE id=1')).rows[0].company_id, '00000000-0000-4000-8000-000000000001');
      assert((await test.query('SELECT 1 FROM game_types WHERE is_active=true')).rowCount > 0);
      assert.equal((await test.query('SELECT 1 FROM users')).rowCount, 0);
      const owners=Object.values(JSON.parse(fs.readFileSync(path.join(root,'db/table-ownership.json'))).owners).flat().sort();
      const actual=(await test.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row=>row.tablename);
      assert.deepEqual(actual,owners,'Fresh installation must contain the same owned tables as an upgraded database');
    } finally { await test.end(); }
    for(const script of ['scripts/test-match-integrity.cjs','scripts/test-parties.cjs']){
      const integrity=spawnSync(process.execPath,[script],{cwd:root,env:{...env,TEST_DATABASE_URL:url.toString()},encoding:'utf8'});
      if(integrity.status!==0)throw new Error(integrity.stderr||integrity.stdout||`${script}: fixtures failed on an empty installation`);
    }
    const runtimeUrl = new URL(url); runtimeUrl.username=role;runtimeUrl.password=password;
    const runtime = new Client({connectionString:runtimeUrl.toString()});await runtime.connect();
    try{
      await runtime.query('SELECT * FROM profiles LIMIT 1');
      await runtime.query('SELECT * FROM game_types LIMIT 1');
      await assert.rejects(runtime.query("UPDATE deployment_identity SET company_name='changed' WHERE id=1"),/permission denied/);
      await assert.rejects(runtime.query('ALTER TABLE profiles ADD COLUMN forbidden int'),/must be owner/);
    }finally{await runtime.end();}
    if(process.argv.includes('--docker')) await require('./test-docker-runtime.cjs')(runtimeUrl.toString(),url.toString());
    console.log('PASS empty PostgreSQL bootstrap, all runtime migrations, safe re-run and company identity; existing local database untouched.');
  } finally {
    if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if ((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rowCount) await admin.query(`DROP ROLE "${role}"`);
    await admin.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
