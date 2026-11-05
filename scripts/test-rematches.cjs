require('./register-typescript.cjs');
const fs=require('node:fs'),Module=require('node:module'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
let currentActor=null;
const load=Module._load;Module._load=function(name,parent,main){if(name==='server-only')return {};if(name==='@/features/identity/public-server')return {getCurrentUser:async()=>currentActor};return load.call(this,name,parent,main);};
Object.assign(process.env,require('dotenv').parse(fs.readFileSync('.env.local')));if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw Error('Local fixtures only');
const {query}=require('../src/server/database/connection.ts');
const {GAME_REGISTRY}=require('../src/features/lounge/domain/game-registry.ts');
const {requestRematch,readRematch,cancelRematch}=require('../src/features/lounge/infrastructure/rematches.ts');
const {createWaitingMatch,activateMatch,cancelWaitingMatch}=require('../src/features/lounge/infrastructure/postgres-match-service.ts');
const users=[randomUUID(),randomUUID(),randomUUID()],sources=[],allIds=new Set();let checks=0;
async function reset(){
 for(const def of Object.values(GAME_REGISTRY)){
  const [a,b]=def.playerColumns;const {rows}=await query(`SELECT id FROM ${def.table} WHERE (${a}=ANY($1::uuid[]) OR ${b}=ANY($1::uuid[])) AND NOT(id=ANY($2::uuid[]))`,[users,sources]);
  const ids=rows.map(row=>row.id);ids.forEach(id=>allIds.add(id));
  if(ids.length){await query('DELETE FROM match_results WHERE game_id=ANY($1::uuid[])',[ids]);await query(`DELETE FROM ${def.table} WHERE id=ANY($1::uuid[])`,[ids]);}
 }
}
async function check(label,work){await reset();await work();checks++;console.log('PASS '+label);}
async function main(){try{
 for(let i=0;i<users.length;i++){const email=`rematch-${users[i]}@office.test`;await query("INSERT INTO users(id,email,password_hash) VALUES($1,$2,'fixture')",[users[i],email]);await query("INSERT INTO profiles(id,email,full_name,role,is_active) VALUES($1,$2,'Rematch fixture','employee',true)",[users[i],email]);}
 for(const type of Object.keys(GAME_REGISTRY)){
  const def=GAME_REGISTRY[type],[a,b]=def.playerColumns;
  const source=(await query(`INSERT INTO ${def.table}(${a},${b},status,created_at) VALUES($1,$2,$3,now()-interval '1 minute') RETURNING id`,[users[0],users[1],def.winStatuses[0]])).rows[0].id;sources.push(source);allIds.add(source);
  await check(type+': leaving lounge/offline does not prevent an invitation; duplicate clicks reuse it',async()=>{
   const results=await Promise.all([1,2,3].map(()=>requestRematch(type,source,users[0])));assert.equal(new Set(results.map(row=>row.id)).size,1);assert.equal(results[0].phase,'pending');assert.equal(results[0].opponentOnline,false);assert.equal((await readRematch(type,source,users[1],results[0].id)).phase,'incoming');
  });
  await check(type+': decline resets state and a new incoming invite supersedes stale history',async()=>{
   const first=await requestRematch(type,source,users[0]);await cancelWaitingMatch(type,first.id,users[1],'recipient');assert.equal((await readRematch(type,source,users[0],first.id)).phase,'declined');
   const next=await requestRematch(type,source,users[1]);assert.notEqual(next.id,first.id);assert.equal((await readRematch(type,source,users[0],first.id)).phase,'incoming');
   const accepted=await requestRematch(type,source,users[0]);assert.equal(accepted.id,next.id);assert.equal(accepted.phase,'accepted');
  });
  await check(type+': cancellation and unanswered expiration permit retry',async()=>{
   const first=await requestRematch(type,source,users[0]);assert.equal((await cancelRematch(type,source,users[0],first.id)).phase,'cancelled');
   const next=await requestRematch(type,source,users[0]);await query(`UPDATE ${def.table} SET created_at=now()-interval '31 minutes' WHERE id=$1`,[next.id]);assert.equal((await readRematch(type,source,users[0],next.id)).phase,'expired');const retry=await requestRematch(type,source,users[0]);assert.notEqual(retry.id,next.id);assert.equal(retry.phase,'pending');
  });
  await check(type+': simultaneous reciprocal invitations start exactly one match',async()=>{
   const results=await Promise.all([requestRematch(type,source,users[0]),requestRematch(type,source,users[1])]);assert.equal(results[0].id,results[1].id);assert.equal((await readRematch(type,source,users[0],results[0].id)).phase,'accepted');assert.equal((await readRematch(type,source,users[1],results[0].id)).phase,'accepted');
  });
  await check(type+': busy recipient receives invite; replacing another game requires explicit consent',async()=>{
   const other=type==='chess'?'ttt':'chess',active=await createWaitingMatch(other,users[1],{targetId:users[2]});await activateMatch(other,active.id,users[2],true);
   const invite=await requestRematch(type,source,users[0]);assert.equal(invite.phase,'pending');assert.equal(invite.opponentBusy,true);await assert.rejects(()=>activateMatch(type,invite.id,users[1],true),/already/);
   await activateMatch(type,invite.id,users[1],true,true);assert.equal((await readRematch(type,source,users[0],invite.id)).phase,'accepted');assert.equal((await query('SELECT reason FROM match_results WHERE game_id=$1',[active.id])).rows[0].reason,'resigned_to_accept_invite');
  });
  await check(type+': sender starting another game does not silently forfeit it',async()=>{
   const invite=await requestRematch(type,source,users[0]),other=type==='chess'?'ttt':'chess';const active=await createWaitingMatch(other,users[0],{targetId:users[2]});await activateMatch(other,active.id,users[2],true);
   await assert.rejects(()=>requestRematch(type,source,users[1]),/opponent has started another game/);assert.equal((await query(`SELECT status FROM ${GAME_REGISTRY[other].table} WHERE id=$1`,[active.id])).rows[0].status,'in_progress');assert.equal((await readRematch(type,source,users[0],invite.id)).phase,'pending');
  });
  await check(type+': acceptance against cancellation remains atomic',async()=>{
   const invite=await requestRematch(type,source,users[0]);await Promise.allSettled([cancelRematch(type,source,users[0],invite.id),activateMatch(type,invite.id,users[1],true)]);const state=await readRematch(type,source,users[0],invite.id);assert(['accepted','cancelled'].includes(state.phase));
  });
  await check(type+': spectators, unfinished originals and disabled opponents cannot create rematches',async()=>{
   await assert.rejects(()=>requestRematch(type,source,users[2]),/Only the two players/);const waiting=await createWaitingMatch(type,users[0],{targetId:users[1]});await assert.rejects(()=>requestRematch(type,waiting.id,users[0]),/Finish this match/);await cancelWaitingMatch(type,waiting.id,users[0]);
   await query('UPDATE profiles SET is_active=false WHERE id=$1',[users[1]]);try{await assert.rejects(()=>requestRematch(type,source,users[0]),/unavailable/);}finally{await query('UPDATE profiles SET is_active=true WHERE id=$1',[users[1]]);}
  });
  await check(type+': returning online and a rematch ending before navigation stay visible',async()=>{
   const invite=await requestRematch(type,source,users[0]);await query('INSERT INTO presence(user_id,last_seen) VALUES($1,now()) ON CONFLICT(user_id) DO UPDATE SET last_seen=now()',[users[1]]);
   try{assert.equal((await readRematch(type,source,users[0],invite.id)).opponentOnline,true);await activateMatch(type,invite.id,users[1],true);await query(`UPDATE ${def.table} SET status=$2 WHERE id=$1`,[invite.id,def.winStatuses[0]]);assert.equal((await readRematch(type,source,users[0],invite.id)).phase,'completed');}finally{await query('DELETE FROM presence WHERE user_id=$1',[users[1]]);}
  });
  await check(type+': reciprocal request does not bypass a Daily Mission warning',async()=>{
   const invite=await requestRematch(type,source,users[0]);const mission=(await query("INSERT INTO daily_sessions(user_id,date,status,allowed_duration_seconds) VALUES($1,CURRENT_DATE,'in_progress',900) RETURNING id",[users[1]])).rows[0];
   try{const reply=await requestRematch(type,source,users[1]);assert.equal(reply.id,invite.id);assert.equal(reply.phase,'incoming');assert.equal((await query(`SELECT status FROM ${def.table} WHERE id=$1`,[invite.id])).rows[0].status,'waiting');}finally{await query('DELETE FROM daily_sessions WHERE id=$1',[mission.id]);}
  });
  await check(type+': removed invitations and outsider cancellation recover safely',async()=>{
   const invite=await requestRematch(type,source,users[0]);await assert.rejects(()=>cancelRematch(type,source,users[2],invite.id),/Only the two players/);await query(`DELETE FROM ${def.table} WHERE id=$1`,[invite.id]);assert.equal((await readRematch(type,source,users[0],invite.id)).phase,'unavailable');assert.notEqual((await requestRematch(type,source,users[0])).id,invite.id);
  });
 }
 await check('rematch actions deliver explicit safe errors rather than masked server exceptions',async()=>{
  const actions=require('../src/app/office-lounge/rematch-actions.ts');
  assert.deepEqual(await actions.requestGameRematch('chess',sources[0]),{ok:false,error:'Please sign in'});
  currentActor={id:users[0]};assert.equal((await actions.requestGameRematch('bad',sources[0])).error,'Invalid rematch');
  assert.equal((await actions.requestGameRematch('chess',sources[0])).ok,true);
  currentActor={id:users[2]};assert.match((await actions.requestGameRematch('chess',sources[0])).error,/Only the two players/);
 });
 console.log(`All ${checks} rematch lifecycle scenarios passed.`);
}finally{
 await reset();await query('DELETE FROM match_results WHERE game_id=ANY($1::uuid[])',[[...allIds]]);await query('DELETE FROM challenge_events WHERE actor_id=ANY($1::uuid[]) OR challenger_id=ANY($1::uuid[]) OR challenged_id=ANY($1::uuid[])',[users]);
 for(const def of Object.values(GAME_REGISTRY)){const [a,b]=def.playerColumns;await query(`DELETE FROM ${def.table} WHERE ${a}=ANY($1::uuid[]) OR ${b}=ANY($1::uuid[])`,[users]);}
 await query('DELETE FROM activity_feed WHERE user_id=ANY($1::uuid[])',[users]);await query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);await global.postgresPool?.end();
}}
main().catch(error=>{console.error(error);process.exitCode=1;});
