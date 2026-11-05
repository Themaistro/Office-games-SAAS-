require('./register-typescript.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env.local'))));
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local schema contract tests only');
const {query}=require('../src/server/database/connection.ts');
async function main(){try{
  const ownership=JSON.parse(fs.readFileSync(path.join(__dirname,'../db/table-ownership.json'))),tables=Object.values(ownership.owners).flat();
  assert.equal(tables.length,new Set(tables).size,'A table has multiple owners');
  const actual=(await query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row=>row.tablename);
  assert.deepEqual([...tables].sort(),actual,'New/removed tables must have an explicit feature owner');
  const fks=(await query("SELECT conname,conrelid::regclass::text AS child,confrelid::regclass::text AS parent FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace")).rows;
  for(const fk of fks){assert(tables.includes(fk.child),fk.conname);assert(tables.includes(fk.parent),fk.conname);}
  console.log(`PASS ${tables.length} public tables have one owner; ${fks.length} foreign keys connect owned tables.`);
}finally{await global.postgresPool?.end();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
