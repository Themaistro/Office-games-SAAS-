const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { Client } = require('pg');
require('./register-typescript.cjs');
const {parseChessSnapshot,assertMatchSnapshot}=require('../src/features/lounge/domain/match-snapshot.ts');
const root = path.join(__dirname, '..');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(root, '.env.local'))));
if (process.env.LOAD_TEST_DATABASE_URL) process.env.DATABASE_URL=process.env.LOAD_TEST_DATABASE_URL;
const base = new URL(process.env.LOAD_TEST_URL || 'http://localhost:3100');
if (!['localhost','127.0.0.1'].includes(base.hostname) || !['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Load test only supports local services');
const percentile = (values, p) => values[Math.max(0, Math.ceil(values.length * p) - 1)];
const mixed=process.env.LOAD_TEST_MIXED==='1';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL }), people = [], games = [], chessGames=[], spectatorGames=[];
  await client.connect();
  try {
    assert.equal((await fetch(new URL('/api/health',base))).status, 200, 'Production server must be ready');
    assert.equal((await fetch(new URL('/api/live',base))).status,200,'Process liveness must be available without login');
    for (let i=0; i<50; i++) {
      const id = randomUUID(), token = randomBytes(32).toString('base64url'), email = `capacity-${id}@office.test`;
      await client.query('INSERT INTO users(id,email,password_hash,email_verified_at) VALUES($1,$2,$3,now())', [id,email,'not-a-login-hash']); people.push({ id, token, email });
      await client.query("INSERT INTO profiles(id,email,full_name,position) VALUES($1,$2,$3,'Local QA')", [id,email,`Capacity QA ${i}`]);
      await client.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes')", [id,createHash('sha256').update(token).digest('hex')]);
    }
    // Real HTTP regression for finished lobbies, second-seat hosts and private invites.
    const loginHtml=await(await fetch(new URL('/login',base))).text();
    const loginAction=loginHtml.match(/name="(\$ACTION_ID_[^"]+)"/);
    assert(loginAction,'Login form must expose its server action');
    const malformed=new FormData();malformed.set(loginAction[1],'');malformed.set('email',new Blob(['invalid']),'input.txt');
    const badLogin=await fetch(new URL('/login',base),{method:'POST',headers:{Origin:base.origin},body:malformed,redirect:'manual'});
    assert.equal(badLogin.status,303,'Malformed form must redirect with validation instead of crashing');assert(badLogin.headers.get('location').includes('error='));
    const password='temporary-fixture-password';await client.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await require('bcryptjs').hash(password,12),people[48].id]);
    const credentials=new FormData();credentials.set(loginAction[1],'');credentials.set('email',people[48].email);credentials.set('password',password);
    const signedIn=await fetch(new URL('/login',base),{method:'POST',headers:{Origin:base.origin},body:credentials,redirect:'manual'});
    assert.equal(signedIn.status,303,'Real login action must succeed');assert(signedIn.headers.get('location').includes('/dashboard'));assert(signedIn.headers.get('set-cookie').includes('office_games_session='));
    for (const [a,b,status] of [[people[0].id,people[1].id,'x_won'],[null,people[0].id,'waiting'],[people[0].id,people[1].id,'waiting']]) {
      games.push((await client.query('INSERT INTO ttt_games(x_player_id,o_player_id,status) VALUES($1,$2,$3) RETURNING id',[a,b,status])).rows[0].id);
    }
    const outsider = await fetch(new URL('/api/lobbies',base),{ headers:{Cookie:`office_games_session=${people[2].token}`} });
    const lobbies = await outsider.json(); assert(Array.isArray(lobbies));
    assert(!lobbies.some(row=>row.id===games[0]),'Finished match appeared as open');
    assert(lobbies.some(row=>row.id===games[1]),'Public second-seat host disappeared');
    assert(!lobbies.some(row=>row.id===games[2]),'Private invitation leaked to an outsider');
    assert.equal((await fetch(new URL('/api/messages',base))).status,401);
    assert.equal((await fetch(new URL('/api/activity',base))).status,401,'Cached company data must still require authentication');
    assert.equal((await fetch(new URL('/api/realtime?type=ttt&id='+games[2],base),{headers:{Cookie:`office_games_session=${people[2].token}`}})).status,403);
    const headersFor = person => ({Cookie:`office_games_session=${person.token}`,'Content-Type':'application/json',Origin:base.origin});
    for(const extra of [{Origin:'https://untrusted.example'},{Origin:'null'},{Origin:'https://untrusted.example','x-forwarded-host':'untrusted.example'}]){
      assert.equal((await fetch(new URL('/api/presence',base),{method:'POST',headers:{...headersFor(people[0]),...extra}})).status,403,'Cross-origin writes must be rejected');
    }
    assert.equal((await fetch(new URL('/api/presence',base),{method:'POST',headers:{Cookie:`office_games_session=${people[0].token}`}})).status,403,'Headerless writes must fail closed');
    const fixture=(await client.query("INSERT INTO chess_games(white_player_id,black_player_id,status,white_time_ms) VALUES($1,$2,'waiting',0) RETURNING id",[people[0].id,people[1].id])).rows[0];chessGames.push(fixture.id);
    const chessResponse=await fetch(new URL('/api/chess/'+fixture.id,base),{headers:headersFor(people[0])});assert.equal(chessResponse.status,200);const snapshot=parseChessSnapshot(await chessResponse.json(),fixture.id);assert.equal(snapshot.white_time_ms,0);
    const boardResponse=await fetch(new URL('/api/ttt/'+games[0],base),{headers:headersFor(people[0])});assert.equal(boardResponse.status,200);assertMatchSnapshot(await boardResponse.json(),'ttt',games[0]);
    await client.query('DELETE FROM chess_games WHERE id=$1',[fixture.id]);
    for(const [type,table,left,right]of [['chess','chess_games','white_player_id','black_player_id'],['ttt','ttt_games','x_player_id','o_player_id'],['connect-four','connect_four_games','red_player_id','yellow_player_id']]){
      const match=(await client.query(`INSERT INTO ${table}(${left},${right},status) VALUES($1,$2,'in_progress') RETURNING id`,[people[0].id,people[1].id])).rows[0];spectatorGames.push([table,match.id]);
      const watched=await fetch(new URL(`/api/${type}/${match.id}`,base),{headers:headersFor(people[2])});assert.equal(watched.status,200);const snapshot=await watched.json();assert(snapshot.spectators.some(person=>person.id===people[2].id),'Spectator was not registered');
      if(type==='chess'){const forbidden=await fetch(new URL(`/api/chess/${match.id}`,base),{method:'POST',headers:headersFor(people[2]),body:JSON.stringify({eventType:'offer_draw'})});assert.equal(forbidden.status,403,'Spectator changed an active match');}
      await client.query(`UPDATE ${table} SET status=$2,updated_at=now() WHERE id=$1`,[match.id,type==='chess'?'white_won':type==='ttt'?'x_won':'red_won']);
      const ended=await(await fetch(new URL(`/api/${type}/${match.id}`,base),{headers:headersFor(people[2])})).json();assert.notEqual(ended.status,'in_progress','Spectator did not receive final state');
      if(type==='chess'){const forbidden=await fetch(new URL(`/api/chess/${match.id}`,base),{method:'POST',headers:headersFor(people[2]),body:JSON.stringify({eventType:'offer_draw'})});assert.equal(forbidden.status,403);}
      await client.query(`DELETE FROM ${table} WHERE id=$1`,[match.id]);
    }
    assert.equal((await fetch(new URL('/api/presence',base),{method:'POST',headers:headersFor(people[0])})).status,200);
    const sent=await fetch(new URL('/api/messages',base),{method:'POST',headers:headersFor(people[0]),body:JSON.stringify({recipientId:people[1].id,body:'Architecture QA message'})});
    assert.equal(sent.status,201);const message=await sent.json();
    const unread=async()=>await(await fetch(new URL('/api/messages',base),{headers:headersFor(people[1])})).json();
    assert.equal((await unread()).unreadCount,1);
    await fetch(new URL('/api/messages',base),{method:'PATCH',headers:headersFor(people[2]),body:JSON.stringify({messageIds:[message.id]})});
    assert.equal((await unread()).unreadCount,1,'Another player cleared the unread message');
    assert.equal((await fetch(new URL('/api/messages',base),{method:'PATCH',headers:headersFor(people[1]),body:JSON.stringify({messageIds:[message.id]})})).status,200);
    assert.equal((await unread()).unreadCount,0);
    await client.query("UPDATE ttt_games SET status='in_progress',x_player_id=$1 WHERE id=$2",[people[3].id,games[1]]);
    const activity=await(await fetch(new URL('/api/me/activity',base),{headers:headersFor(people[0])})).json();
    assert.equal(activity.activeMatch.id,games[1]);assert.equal(activity.activeMatch.type,'ttt');
    await client.query("UPDATE ttt_games SET status='waiting',x_player_id=NULL WHERE id=$1",[games[1]]);
    const anonymousAdmin = await fetch(new URL('/admin/users',base),{redirect:'manual'});
    assert([307,308].includes(anonymousAdmin.status)); assert(anonymousAdmin.headers.get('location').includes('/login'));
    const employeeAdmin = await fetch(new URL('/admin/users',base),{redirect:'manual',headers:{Cookie:`office_games_session=${people[0].token}`}});
    assert([307,308].includes(employeeAdmin.status)); assert(employeeAdmin.headers.get('location').includes('/dashboard'));
    for (const route of ['/dashboard','/profile',`/profile/${people[1].id}`,'/people','/messages','/office-lounge','/daily-mission','/leaderboard']) {
      const response=await fetch(new URL(route,base),{headers:{Cookie:`office_games_session=${people[0].token}`}});
      const html=await response.text();assert.equal(response.status,200,route);assert(!html.includes('Application error:'),route);
    }
    await client.query("UPDATE profiles SET role='admin' WHERE id=$1",[people[49].id]);
    for(const route of ['/admin','/admin/analytics','/admin/announcements','/admin/departments','/admin/games','/admin/onboarding','/admin/prizes','/admin/questions','/admin/settings','/admin/users',`/profile/${people[0].id}`]) {
      const response=await fetch(new URL(route,base),{headers:{Cookie:`office_games_session=${people[49].token}`}});
      const html=await response.text();assert.equal(response.status,200,route);assert(!html.includes('Application error:'),route);
      if(route.startsWith('/profile/'))assert(html.includes('Admin viewing mode'),'Admin profile preview lost its context');
    }
    await client.query("UPDATE profiles SET role='employee' WHERE id=$1",[people[49].id]);
    const report = [];
    for (const concurrency of [5,20,50]) {
      const timings = [], errors = [], started = performance.now(); let requests = 0;
      await Promise.all(people.slice(0,concurrency).map(async (person,index) => {
        for (let round=0; round<(mixed?60:15); round++) {
          const endpoint = ['/api/presence','/api/messages','/api/lobbies','/api/activity','/api/notifications'][round%5];
          const began = performance.now();
          try {
            const write=mixed&&round%4<2;
            const target=write?(round%4===0?'/api/presence':'/api/messages'):endpoint;
            const response = await fetch(new URL(target,base), {
              headers:write?headersFor(person):{Cookie:`office_games_session=${person.token}`},
              ...(write?{method:'POST',...(target==='/api/messages'?{body:JSON.stringify({recipientId:people[(index+1)%people.length].id,body:'Temporary mixed-load fixture'})}:{})}:{}),
              signal:AbortSignal.timeout(15000)
            });
            await response.text(); if (![200,201].includes(response.status)) errors.push({ endpoint:target,status:response.status });
          } catch { errors.push({endpoint,status:'network failure'}); }
          requests++; timings.push(performance.now()-began);
          // Deterministic brief think time; every virtual player remains independent.
          if (mixed||index%3===0) await new Promise(resolve=>setTimeout(resolve,mixed?20:5));
        }
      }));
      timings.sort((a,b)=>a-b); const elapsed = performance.now()-started;
      report.push({ concurrentClients:concurrency,requests,errorCount:errors.length,p50Ms:Math.round(percentile(timings,.5)),p95Ms:Math.round(percentile(timings,.95)),p99Ms:Math.round(percentile(timings,.99)),requestsPerSecond:Math.round(requests*1000/elapsed) });
      assert.equal(errors.length,0,JSON.stringify(errors.slice(0,3)));
    }
    const output = { date:new Date().toISOString(), target:process.env.LOAD_TEST_TARGET||'local production build', workload:mixed?'mixed reads/presence writes/private fixture messages':'authenticated reads', stages:report, limitations:'Small local database and bounded workload. Not a production concurrency guarantee, live move-latency measurement, websocket fanout test, or sustained soak test.' };
    fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output',mixed?'mixed-capacity.json':process.env.LOAD_TEST_REPORT==='container-capacity.json'?'container-capacity.json':'local-capacity.json'),JSON.stringify(output,null,2));
    console.table(report); console.log('PASS lobby/privacy HTTP regressions; temporary identities and games removed on exit.');
  } finally {
    for(const [table,id]of spectatorGames)await client.query(`DELETE FROM ${table} WHERE id=$1`,[id]);
    if(chessGames.length)await client.query('DELETE FROM chess_games WHERE id=ANY($1::uuid[])',[chessGames]);
    if(games.length) await client.query('DELETE FROM ttt_games WHERE id=ANY($1::uuid[])',[games]);
    for(const person of people) {
      await client.query('DELETE FROM users WHERE id=$1',[person.id]);
      await client.query('DELETE FROM authentication_attempts WHERE bucket=$1',[createHash('sha256').update('login-account:'+person.email).digest('hex')]);
    }
    await client.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
