const fs = require('node:fs'), path = require('node:path'), { Client } = require('pg');
const root = path.join(__dirname, '..');
if (process.argv.includes('--local')) Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local'))));
const banks = {
  master_trivia_bank: { fields:['id','question','answer','decoys','department','difficulty'], key:'question' },
  master_word_bank: { fields:['id','word','difficulty'], key:'word' },
  master_typing_bank: { fields:['id','prompt_text','difficulty'], key:'prompt_text' },
  master_odd_object_bank: { fields:['id','theme','items','difficulty'], key:'theme' },
};
async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['localhost','127.0.0.1'].includes(url.hostname) && !process.argv.includes('--allow-remote')) throw new Error('Remote content installation requires --allow-remote and an explicitly supplied connection');
  const release = JSON.parse(fs.readFileSync(path.join(root,'db/content/release.json')));
  const client = new Client({connectionString:url.toString()}); await client.connect();
  try {
    const identity=(await client.query('SELECT company_id FROM deployment_identity WHERE id=1')).rows[0];
    if(!identity || identity.company_id !== (process.env.OFFICE_GAMES_COMPANY_ID || '00000000-0000-4000-8000-000000000001')) throw new Error('Company database identity mismatch');
    await client.query('BEGIN');
    for (const [table,bank] of Object.entries(banks)) {
      let inserted=0;
      for (const row of release.banks[table]) {
        const values=bank.fields.map(field=>['decoys','items'].includes(field)?JSON.stringify(row[field]):row[field]);
        const extra=table==='master_odd_object_bank'?' AND items=$'+(bank.fields.indexOf('items')+1):table==='master_trivia_bank'?' AND department=$'+(bank.fields.indexOf('department')+1):'';
        const result=await client.query(`INSERT INTO ${table}(${bank.fields.join(',')}) SELECT ${values.map((_,i)=>'$'+(i+1)).join(',')}
          WHERE NOT EXISTS(SELECT 1 FROM ${table} WHERE ${bank.key}=$${bank.fields.indexOf(bank.key)+1} AND difficulty=$${bank.fields.indexOf('difficulty')+1}${extra}) ON CONFLICT(id) DO NOTHING`,values);
        inserted+=result.rowCount;
      }
      console.log(`Content ${table}: ${inserted} new source items`);
    }
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK');throw error; }
  finally { await client.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
