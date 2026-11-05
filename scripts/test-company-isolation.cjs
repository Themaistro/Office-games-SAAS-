require('./register-typescript.cjs');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env.local'))));
if (!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Local tests only');
const { query } = require('../src/server/database/connection.ts');
async function main() {
  const original = process.env.OFFICE_GAMES_COMPANY_ID, publicId = process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID;
  try {
    await query('SELECT 1');
    process.env.OFFICE_GAMES_COMPANY_ID = process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID = '00000000-0000-4000-8000-000000000099';
    await assert.rejects(query('SELECT * FROM profiles LIMIT 1'), /identity mismatch/);
    await assert.rejects(query('UPDATE profiles SET total_xp=0'), /identity mismatch/);
    process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID = publicId;
    await assert.rejects(query('SELECT 1'), /IDs must match/);
    process.env.OFFICE_GAMES_COMPANY_ID = original;
    await query('SELECT 1');
    console.log('PASS wrong-company reads/writes and server/public identity mismatches are denied before application SQL; correct configuration recovers.');
  } finally {
    if (original === undefined) delete process.env.OFFICE_GAMES_COMPANY_ID; else process.env.OFFICE_GAMES_COMPANY_ID = original;
    if (publicId === undefined) delete process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID; else process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID = publicId;
    await global.postgresPool?.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
