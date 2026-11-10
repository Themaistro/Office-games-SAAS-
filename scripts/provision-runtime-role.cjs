const {Client}=require('pg');
const {postgresConfig}=require('./postgres-config.cjs');
async function main(){
  const url=new URL(process.env.MIGRATION_DATABASE_URL||process.env.DATABASE_URL||'');
  if(!['localhost','127.0.0.1'].includes(url.hostname)&&!process.argv.includes('--allow-remote'))throw new Error('Remote role provisioning requires --allow-remote');
  const role=process.env.RUNTIME_DATABASE_ROLE,password=process.env.RUNTIME_DATABASE_PASSWORD;
  if(!/^[a-z][a-z0-9_]{2,55}$/.test(role||''))throw new Error('Supply a lowercase RUNTIME_DATABASE_ROLE');
  if(!/^[A-Za-z0-9_-]{40,128}$/.test(password||''))throw new Error('Supply a 40–128 character random URL-safe runtime password');
  const c=new Client(postgresConfig(url.toString()));await c.connect();
  try{
    await c.query('BEGIN');
    const company=(await c.query('SELECT company_id FROM deployment_identity WHERE id=1')).rows[0];
    if(!company||company.company_id!==process.env.OFFICE_GAMES_COMPANY_ID)throw new Error('Company database identity mismatch');
    const existing=(await c.query("SELECT oid,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,shobj_description(oid,'pg_authid') AS label FROM pg_roles WHERE rolname=$1",[role])).rows[0];
    const label='office_games:'+company.company_id;
    if(existing&&(existing.rolsuper||existing.rolcreatedb||existing.rolcreaterole||existing.rolbypassrls||existing.label!==label))throw new Error('Refusing to modify an administrator or a role not owned by this company');
    const exists=Boolean(existing);
    // Identifiers and password use strict alphabets above; no secret is logged.
    await c.query(`${exists?'ALTER':'CREATE'} ROLE "${role}" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`);
    await c.query(`COMMENT ON ROLE "${role}" IS '${label}'`);
    for(const [setting,variable,fallback]of [['statement_timeout','DATABASE_STATEMENT_TIMEOUT_MS',15000],['lock_timeout','DATABASE_LOCK_TIMEOUT_MS',5000],['idle_in_transaction_session_timeout','DATABASE_IDLE_TRANSACTION_TIMEOUT_MS',15000]]){
      const value=Number(process.env[variable]??fallback);
      if(!Number.isInteger(value)||value<100||value>300000)throw new Error(`${variable} must be between 100 and 300000 milliseconds`);
      await c.query(`ALTER ROLE "${role}" SET ${setting} TO '${value}ms'`);
    }
    await c.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await c.query(`REVOKE CREATE ON SCHEMA public FROM "${role}"`);
    const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows;
    for(const {tablename:table}of tables){
      if(!/^[a-z_][a-z0-9_]*$/.test(table))throw new Error('Unexpected table identifier');
      await c.query(`REVOKE ALL ON TABLE public."${table}" FROM "${role}"`);
      const readOnly=['deployment_identity','schema_migrations'].includes(table);
      await c.query(`GRANT ${readOnly?'SELECT':'SELECT,INSERT,UPDATE,DELETE'} ON TABLE public."${table}" TO "${role}"`);
      await c.query(`DROP POLICY IF EXISTS office_games_trusted_server ON public."${table}"`);
      // This credential is for the authenticated server only, never a browser.
      // It cannot alter schema/roles or change the company identity.
      await c.query(`CREATE POLICY office_games_trusted_server ON public."${table}" FOR ALL TO "${role}" USING(true) WITH CHECK(true)`);
    }
    await c.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO "${role}"`);
    await c.query('COMMIT');console.log('Server runtime role provisioned without schema/role administration privileges.');
  }catch(error){await c.query('ROLLBACK');throw error;}finally{await c.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
