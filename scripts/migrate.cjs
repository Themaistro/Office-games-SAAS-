const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {Client} = require('pg');
const root=path.resolve(__dirname,'..');
// Explicitly opt into local configuration; remote runs must supply DATABASE_URL.
if(process.argv.includes('--local'))Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local'))));
async function migrate(){
  const connectionString=process.env.DATABASE_URL;if(!connectionString)throw new Error('Supply DATABASE_URL or pass --local');
  const url=new URL(connectionString),local=['localhost','127.0.0.1'].includes(url.hostname);
  if(process.argv.includes('--local')&&!local)throw new Error('--local refuses nonlocal databases');
  const client=new Client({connectionString,connectionTimeoutMillis:5000,...(!local?{ssl:{rejectUnauthorized:true}}:{})});
  await client.connect();
  try{
    await client.query("SELECT pg_advisory_lock(hashtext('office-games-schema-upgrade'))");
    const base=await client.query("SELECT to_regclass('public.profiles') AS table_name");
    if(!base.rows[0].table_name)throw new Error('Base schema missing. Bootstrap an empty database with the checked-in Docker initialization first. This upgrade runner never seeds or wipes data.');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
    const files=JSON.parse(fs.readFileSync(path.join(root,'db/runtime-migrations.json'),'utf8'));
    for(const name of files){
      const sql=fs.readFileSync(path.join(root,name),'utf8');
      // Git checkouts may use CRLF on Windows and LF on deployment hosts.
      const normalizedSql=sql.replace(/\r\n/g,'\n');
      const checksum=createHash('sha256').update(normalizedSql).digest('hex');
      const legacyChecksums=[normalizedSql,normalizedSql.replace(/\n/g,'\r\n')].map(value=>createHash('sha256').update(value).digest('hex'));
      const {rows}=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
      if(rows[0]){if(!legacyChecksums.includes(rows[0].checksum))throw new Error(`Applied migration changed: ${name}. Add a new migration instead.`);console.log(`Unchanged: ${name}`);continue;}
      await client.query('BEGIN');
      try{
        // Adopt the legacy ranks migration only when its actual schema is present.
        const legacyRanks=name.endsWith('migration15_lounge_ranks.sql') ? await client.query("SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='profiles_lounge_lp_nonnegative'") : null;
        if(!legacyRanks?.rowCount)await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);await client.query('COMMIT');console.log(`Applied: ${name}`);
      }catch(error){await client.query('ROLLBACK');throw error;}
    }
  }finally{await client.end();}
}
migrate().catch(error=>{console.error(error.message);process.exitCode=1;});
