// Read-only release checks; prints no URLs, credentials or account identities.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
const {postgresConfig}=require('./postgres-config.cjs');
const root=path.join(__dirname,'..');
if(process.argv.includes('--local'))Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local'))));
async function main(){
  const checks=[],strict=process.argv.includes('--strict');
  const add=(name,state,detail)=>checks.push({name,state,detail});
  const expected=process.env.OFFICE_GAMES_COMPANY_ID;
  if(!expected||expected!==process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID)add('company-config','fail','Supply matching server and build company IDs.');
  if(process.env.MIGRATION_DATABASE_URL)add('credential-separation','fail','Remove the operator credential from the application environment.');
  const mode=process.env.REGISTRATION_MODE||'invite';
  add('registration',mode==='invite'?'pass':strict?'fail':'warn',mode==='invite'?'Invitation-only registration.':'Open registration is configured; choose this deliberately before launch.');
  const passwordMin=Number(process.env.REGISTRATION_PASSWORD_MIN_LENGTH??12);
  add('new-password-policy',Number.isInteger(passwordMin)&&passwordMin>=12&&passwordMin<=64?'pass':strict?'fail':'warn','Recommended new-password minimum is at least 12; existing accounts are not changed.');
  add('realtime',process.env.ABLY_API_KEY?'pass':'warn',process.env.ABLY_API_KEY?'Server publisher credential configured; capability/delivery test still required.':'Polling fallback only; verify expected realtime behavior before launch.');
  const url=new URL(process.env.OFFICE_GAMES_DATABASE_URL||process.env.DATABASE_URL||'');
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&!process.argv.includes('--allow-remote'))throw new Error('Remote read-only checks require --allow-remote');
  const c=new Client(postgresConfig(url.toString()));await c.connect();
  try{
    const identity=(await c.query('SELECT company_id FROM deployment_identity WHERE id=1')).rows[0];
    add('company-identity',identity?.company_id===expected?'pass':'fail','Database identity must match the build/server configuration.');
    const role=(await c.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,pg_has_role(current_user,(SELECT relowner FROM pg_class WHERE oid='public.profiles'::regclass),'USAGE') AS owns_tables FROM pg_roles WHERE rolname=current_user")).rows[0];
    add('runtime-role',role&&Object.values(role).every(value=>value===false)?'pass':'fail','Runtime must not administer roles/schema or own application tables.');
    const wanted=JSON.parse(fs.readFileSync(path.join(root,'db/runtime-migrations.json')));
    const applied=new Set((await c.query('SELECT name FROM schema_migrations')).rows.map(row=>row.name));
    add('migrations',wanted.every(name=>applied.has(name))?'pass':'fail','All checked-in runtime migrations must be applied before promotion.');
    const limits=(await c.query("SELECT current_setting('statement_timeout') AS statement,current_setting('lock_timeout') AS lock,current_setting('idle_in_transaction_session_timeout') AS idle")).rows[0];
    add('role-timeouts',Object.values(limits).every(value=>value!=='0')?'pass':strict?'fail':'warn','Role defaults must bound statement, lock and idle-transaction lifetimes, including transaction-pooled connections.');
    const pool=Number(process.env.DATABASE_POOL_MAX??10),instances=Number(process.env.EXPECTED_MAX_INSTANCES??0),budget=Number(process.env.DATABASE_CONNECTION_BUDGET??0);
    if(!Number.isInteger(pool)||pool<1||pool>100)add('pool-configuration','fail','Pool maximum must be an integer from 1 to 100.');
    else if(instances>0&&budget>0)add('connection-budget',pool*instances<budget?'pass':'fail',`Maximum application demand ${pool*instances}; configured database budget ${budget}. Reserve operator/deployment capacity too.`);
    else add('connection-budget',strict?'fail':'warn','Set EXPECTED_MAX_INSTANCES and DATABASE_CONNECTION_BUDGET for the chosen hosting; the pool limit is per worker.');
    const qa=(await c.query("SELECT count(*)::int AS n FROM users WHERE email ~* '^test[0-9]*@test\\.com$' OR email='admin@admin.com'")).rows[0].n;
    if(qa)add('test-accounts',strict?'fail':'warn',`${qa} known test-style accounts exist; review them before launch. No accounts were modified.`);
  }finally{await c.end();}
  const report={date:new Date().toISOString(),scope:process.argv.includes('--local')?'local':'explicit deployment target',checks,passed:!checks.some(check=>check.state==='fail')};
  fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output/deployment-preflight.json'),JSON.stringify(report,null,2));
  console.table(checks);if(!report.passed)process.exitCode=1;
}
main().catch(error=>{console.error('Preflight could not complete.',{kind:error.name,code:typeof error.code==='string'?error.code:undefined});process.exitCode=1;});
