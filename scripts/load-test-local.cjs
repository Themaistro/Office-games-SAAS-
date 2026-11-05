const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { Client } = require('pg');
const root = path.join(__dirname, '..');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(root, '.env.local'))));
if (process.env.LOAD_TEST_DATABASE_URL) process.env.DATABASE_URL=process.env.LOAD_TEST_DATABASE_URL;
const base = new URL(process.env.LOAD_TEST_URL || 'http://localhost:3100');
if (!['localhost','127.0.0.1'].includes(base.hostname) || !['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Load test only supports local services');
const percentile = (values, p) => values[Math.max(0, Math.ceil(values.length * p) - 1)];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL }), people = [], games = [];
  await client.connect();
  try {
    assert.equal((await fetch(new URL('/api/health',base))).status, 200, 'Production server must be ready');
    for (let i=0; i<50; i++) {
      const id = randomUUID(), token = randomBytes(32).toString('base64url'), email = `capacity-${id}@office.test`;
      await client.query('INSERT INTO users(id,email,password_hash,email_verified_at) VALUES($1,$2,$3,now())', [id,email,'not-a-login-hash']); people.push({ id, token });
      await client.query("INSERT INTO profiles(id,email,full_name,position) VALUES($1,$2,$3,'Local QA')", [id,email,`Capacity QA ${i}`]);
      await client.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '15 minutes')", [id,createHash('sha256').update(token).digest('hex')]);
    }
    // Real HTTP regression for finished lobbies, second-seat hosts and private invites.
    for (const [a,b,status] of [[people[0].id,people[1].id,'x_won'],[null,people[0].id,'waiting'],[people[0].id,people[1].id,'waiting']]) {
      games.push((await client.query('INSERT INTO ttt_games(x_player_id,o_player_id,status) VALUES($1,$2,$3) RETURNING id',[a,b,status])).rows[0].id);
    }
    const outsider = await fetch(new URL('/api/lobbies',base),{ headers:{Cookie:`office_games_session=${people[2].token}`} });
    const lobbies = await outsider.json(); assert(Array.isArray(lobbies));
    assert(!lobbies.some(row=>row.id===games[0]),'Finished match appeared as open');
    assert(lobbies.some(row=>row.id===games[1]),'Public second-seat host disappeared');
    assert(!lobbies.some(row=>row.id===games[2]),'Private invitation leaked to an outsider');
    assert.equal((await fetch(new URL('/api/messages',base))).status,401);
    assert.equal((await fetch(new URL('/api/realtime?type=ttt&id='+games[2],base),{headers:{Cookie:`office_games_session=${people[2].token}`}})).status,403);
    const headersFor = person => ({Cookie:`office_games_session=${person.token}`,'Content-Type':'application/json'});
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
        for (let round=0; round<15; round++) {
          const endpoint = ['/api/presence','/api/messages','/api/lobbies','/api/activity','/api/notifications'][round%5];
          const began = performance.now();
          try {
            const response = await fetch(new URL(endpoint,base), { headers:{Cookie:`office_games_session=${person.token}`}, signal:AbortSignal.timeout(15000) });
            await response.text(); if (response.status !== 200) errors.push({ endpoint,status:response.status });
          } catch { errors.push({endpoint,status:'network failure'}); }
          requests++; timings.push(performance.now()-began);
          // Deterministic brief think time; every virtual player remains independent.
          if (index%3===0) await new Promise(resolve=>setTimeout(resolve,5));
        }
      }));
      timings.sort((a,b)=>a-b); const elapsed = performance.now()-started;
      report.push({ concurrentClients:concurrency,requests,errorCount:errors.length,p50Ms:Math.round(percentile(timings,.5)),p95Ms:Math.round(percentile(timings,.95)),p99Ms:Math.round(percentile(timings,.99)),requestsPerSecond:Math.round(requests*1000/elapsed) });
      assert.equal(errors.length,0,JSON.stringify(errors.slice(0,3)));
    }
    const output = { date:new Date().toISOString(), target:process.env.LOAD_TEST_TARGET||'local production build', stages:report, limitations:'Small local database; authenticated HTTP reads only. Not a production concurrency guarantee, websocket fanout test, or soak test.' };
    fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output',process.env.LOAD_TEST_REPORT==='container-capacity.json'?'container-capacity.json':'local-capacity.json'),JSON.stringify(output,null,2));
    console.table(report); console.log('PASS lobby/privacy HTTP regressions; temporary identities and games removed on exit.');
  } finally {
    if(games.length) await client.query('DELETE FROM ttt_games WHERE id=ANY($1::uuid[])',[games]);
    for(const person of people) await client.query('DELETE FROM users WHERE id=$1',[person.id]);
    await client.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
