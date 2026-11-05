const fs = require('node:fs'), path = require('node:path');
const { Client } = require('pg');
const root = path.join(__dirname, '..');
if (process.argv.includes('--local')) Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(root, '.env.local'))));
async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Bootstrap CLI is restricted to empty local databases. Use the documented provisioning procedure for production.');
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    if ((await client.query("SELECT to_regclass('public.profiles') AS table_name")).rows[0].table_name) throw new Error('Database already contains application data. Bootstrap refuses to overwrite it.');
    const files = JSON.parse(fs.readFileSync(path.join(root, 'db/bootstrap-migrations.json')));
    for (const file of files) {
      try { await client.query(fs.readFileSync(path.join(root, file), 'utf8')); }
      catch (error) { throw new Error(`${file}: ${error.message}`); }
      console.log('Initialized:', file);
    }
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
