require('./register-typescript.cjs');
const Module=require('node:module'),load=Module._load;
let cookie;
Module._load=function(name,...args){
  if(name==='server-only')return {};
  if(name==='next/headers')return {cookies:async()=>({set:(name,token,options)=>{cookie={token,options};}})};
  return load.call(this,name,...args);
};
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
Object.assign(process.env,require('dotenv').parse(fs.readFileSync('.env.local')));
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local test only');
process.env.DATABASE_STATEMENT_TIMEOUT_MS='250';
const {query,withTransaction}=require('../src/server/database/connection.ts');
const {consumeAttempt}=require('../src/features/identity/infrastructure/attempt-limits.ts');
const {sessionIdentity}=require('../src/features/identity/infrastructure/session-identity.ts');
const {expireBoardInvitations}=require('../src/features/lounge/infrastructure/invitation-expiry.ts');
const {GAME_REGISTRY,GAME_TYPES}=require('../src/features/lounge/domain/game-registry.ts');
const {createSession}=require('../src/features/identity/infrastructure/authentication.ts');
const {updateProfilesForToggleUserStatus}=require('../src/features/players/infrastructure/admin-users-actions-queries.ts');
async function main(){
  const scope=randomUUID(),person=randomUUID(),token='a'.repeat(43),games=[];
  try{
    const allowed=await Promise.all(Array.from({length:20},()=>consumeAttempt(scope,'one',5,600)));assert.equal(allowed.filter(Boolean).length,5);
    const bucket=createHash('sha256').update(scope+':one').digest('hex');await query("UPDATE authentication_attempts SET expires_at=now()-interval '1 second' WHERE bucket=$1",[bucket]);assert(await consumeAttempt(scope,'one',5,600));
    await query('INSERT INTO users(id,email) VALUES($1,$2)',[person,`hardening-${person}@office.test`]);
    await query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",[person,createHash('sha256').update(token).digest('hex')]);
    assert.equal(await sessionIdentity(token),null,'Orphaned users must fail closed');
    await query("INSERT INTO profiles(id,email,full_name,role,is_active) SELECT id,email,'Hardening QA','employee',false FROM users WHERE id=$1",[person]);assert.equal(await sessionIdentity(token),null);
    await query('UPDATE profiles SET is_active=true WHERE id=$1',[person]);assert.equal((await sessionIdentity(token)).id,person);
    for(let i=0;i<12;i++)await createSession(person);
    assert.equal((await query('SELECT count(*)::int AS n FROM sessions WHERE user_id=$1',[person])).rows[0].n,10);
    assert(cookie.options.httpOnly);assert.equal(cookie.options.sameSite,'lax');
    await updateProfilesForToggleUserStatus([false,person]);assert.equal(await sessionIdentity(cookie.token),null);
    await updateProfilesForToggleUserStatus([true,person]);assert.equal(await sessionIdentity(cookie.token),null,'Reactivation must not revive revoked sessions');
    await query("INSERT INTO sessions(user_id,token_hash,expires_at,created_at) VALUES($1,$2,now()+interval '1 hour',now()-interval '9 hours')",[person,createHash('sha256').update(token).digest('hex')]);
    await query("UPDATE profiles SET role='admin' WHERE id=$1",[person]);assert.equal(await sessionIdentity(token),null,'Old admin sessions require fresh login');
    await query("UPDATE profiles SET role='employee' WHERE id=$1",[person]);assert.equal((await sessionIdentity(token)).id,person);
    for(const type of GAME_TYPES){const def=GAME_REGISTRY[type],[a,b]=def.playerColumns;const id=(await query(`INSERT INTO ${def.table}(${a},status,created_at) VALUES($1,'waiting',now()-interval '31 minutes') RETURNING id`,[person])).rows[0].id;games.push([type,id]);}
    await query("DELETE FROM maintenance_leases WHERE name='board-invitation-expiry'");
    await query('UPDATE profiles SET is_active=false WHERE id=$1',[person]);
    await Promise.all(Array.from({length:5},()=>expireBoardInvitations()));
    for(const [type,id]of games){assert.equal((await query(`SELECT id FROM ${GAME_REGISTRY[type].table} WHERE id=$1`,[id])).rowCount,0);assert.equal((await query("SELECT id FROM challenge_events WHERE game_id=$1 AND event_type='expired'",[id])).rowCount,1);}
    await assert.rejects(withTransaction(async()=>query('SELECT pg_sleep(1)')),error=>error.code==='57014');
    assert.equal((await query('SELECT 1 AS ok')).rows[0].ok,1,'Pool remains usable after timeout rollback');
    console.log('PASS cross-worker attempt budgets/reset, orphan/inactive identity denial, concurrent atomic expiry and statement timeout rollback/recovery.');
  }finally{
    for(const [type,id]of games){await query(`DELETE FROM ${GAME_REGISTRY[type].table} WHERE id=$1`,[id]);await query('DELETE FROM challenge_events WHERE game_id=$1',[id]);}
    await query('DELETE FROM users WHERE id=$1',[person]);
    await query('DELETE FROM authentication_attempts WHERE bucket=$1',[createHash('sha256').update(scope+':one').digest('hex')]);
    await global.postgresPool?.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
