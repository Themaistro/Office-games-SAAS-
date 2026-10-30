const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'..');Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local'))));
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw Error('Local database only');
const load=Module._load,resolve=Module._resolveFilename;Module._load=function(name,parent,main){if(name==='server-only')return {};return load.call(this,name,parent,main);};Module._resolveFilename=function(name,parent,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...args);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {query,withTransaction}=require('../src/lib/db.ts'),party=require('../src/lib/party-service.ts'),match=require('../src/lib/match-service.ts');
const ids=Array.from({length:14},()=>randomUUID()),rooms=[],games=[];let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
async function create(host,format='trivia',mode='duel',visibility='public'){const id=await party.createParty(host,{format,mode,rounds:3,visibility});rooms.push(id);return id;}
async function start(id,host,guest){await party.joinParty(guest,id);await party.startParty(host,id);await query("UPDATE lounge_rooms SET round_started_at=now()-interval '2 seconds',deadline_at=now()+interval '58 seconds' WHERE id=$1",[id]);}
async function main(){try{
  for(const [i,id]of ids.entries()){const email=`party-test-${id}@example.invalid`;await query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[id,email,'not-a-login']);await query('INSERT INTO profiles(id,email,full_name) VALUES($1,$2,$3)',[id,email,`Party fixture ${i}`]);}
  const privateRoom=await create(ids[2],'trivia','group','private');
  await check('private rooms require an invitation for joining and spectating',async()=>{await assert.rejects(()=>party.partySnapshot(ids[0],privateRoom),/private/);await assert.rejects(()=>party.joinParty(ids[0],privateRoom),/invitation/);await party.inviteParty(ids[2],privateRoom,ids[3]);await party.joinParty(ids[3],privateRoom);assert.equal((await party.partySnapshot(ids[3],privateRoom)).isMember,true);await assert.rejects(()=>party.inviteParty(ids[3],privateRoom,ids[1]),/host/);});
  await party.leaveParty(ids[2],privateRoom);await party.leaveParty(ids[3],privateRoom);
  const id=await create(ids[0]);
  await check('host-only start, capacity and frozen identical question pack',async()=>{await assert.rejects(()=>party.startParty(ids[1],id),/host/);await start(id,ids[0],ids[1]);const a=await party.partySnapshot(ids[0],id),b=await party.partySnapshot(ids[1],id);assert.equal(a.question.id,b.question.id);assert.equal(a.question.correct_answer,'');assert.equal(a.reveal,null);assert.equal((await query('SELECT count(*)::int AS n FROM lounge_room_rounds WHERE room_id=$1',[id])).rows[0].n,3);await assert.rejects(()=>party.joinParty(ids[2],id),/started|closed/);});
  await check('spectators cannot submit and private answers/scores stay hidden',async()=>{const q=(await query('SELECT question FROM lounge_room_rounds WHERE room_id=$1 AND position=0',[id])).rows[0].question;await assert.rejects(()=>party.answerParty(ids[2],id,0,q.correct_answer),/players/);await party.answerParty(ids[0],id,0,q.correct_answer);const spectator=await party.partySnapshot(ids[2],id);assert.equal(spectator.reveal,null);assert.equal(spectator.players[0].score,0);assert.equal(spectator.players[0].submitted,true);assert.equal(spectator.players[0].answer,undefined);});
  await check('duplicate answers score once and reveal only after everyone finishes',async()=>{const q=(await query('SELECT question FROM lounge_room_rounds WHERE room_id=$1 AND position=0',[id])).rows[0].question;await Promise.all([party.answerParty(ids[1],id,0,'wrong'),party.answerParty(ids[1],id,0,q.correct_answer)]);const state=await party.partySnapshot(ids[2],id);assert.equal(state.room.phase,'reveal');assert.equal(state.reveal.correctAnswer,q.correct_answer);assert.equal(state.reveal.answers.length,2);assert.equal((await query('SELECT count(*)::int AS n FROM lounge_room_answers WHERE room_id=$1 AND position=0',[id])).rows[0].n,2);const score=state.players.find(p=>p.user_id===ids[0]).score;await party.partySnapshot(ids[0],id);assert.equal((await party.partySnapshot(ids[0],id)).players.find(p=>p.user_id===ids[0]).score,score);});
  await check('active party seats block board-game activation',async()=>{const game=(await query('INSERT INTO ttt_games(x_player_id,o_player_id) VALUES($1,$2) RETURNING id',[ids[2],ids[0]])).rows[0].id;games.push(game);await assert.rejects(()=>match.activateMatch('ttt',game,ids[0],true),/party/);});
  await check('deadline expiry and reveal advance are server-controlled',async()=>{await query("UPDATE lounge_rooms SET advance_at=now()-interval '1 second' WHERE id=$1",[id]);let state=await party.partySnapshot(ids[0],id);assert.equal(state.room.current_round,1);await query("UPDATE lounge_rooms SET deadline_at=now()-interval '1 second' WHERE id=$1",[id]);state=await party.partySnapshot(ids[1],id);assert.equal(state.room.phase,'reveal');await assert.rejects(()=>party.answerParty(ids[0],id,1,'late'),/not accepting/);});
  await check('confirmed switch to a board match forfeits the party seat',async()=>{await match.activateMatch('ttt',games[0],ids[0],true,true);const state=await party.partySnapshot(ids[1],id);assert.equal(state.room.status,'finished');assert.equal(state.players.find(p=>p.user_id===ids[0]).state,'resigned');await query("UPDATE ttt_games SET status='draw' WHERE id=$1",[games[0]]);});
  await check('mixed group freezes more than one game type without touching solo progress',async()=>{const group=await create(ids[2],'mixed','group');await start(group,ids[2],ids[3]);const rounds=(await query('SELECT question FROM lounge_room_rounds WHERE room_id=$1',[group])).rows;assert.ok(new Set(rounds.map(row=>row.question.game_type.slug)).size>1);const solo=await query('SELECT id FROM daily_sessions WHERE user_id=ANY($1::uuid[])',[ids]);assert.equal(solo.rowCount,0);const xp=await query('SELECT total_xp FROM profiles WHERE id=ANY($1::uuid[])',[ids]);assert.ok(xp.rows.every(row=>row.total_xp===0));});
  await check('three-player group finishes all rounds with one settlement per round',async()=>{
    for(const room of rooms)await query("UPDATE lounge_rooms SET status='cancelled' WHERE id=$1",[room]);
    const group=await create(ids[0],'trivia','group');
    await party.joinParty(ids[1],group);await party.joinParty(ids[2],group);await party.startParty(ids[0],group);
    for(let position=0;position<3;position++){
      await query("UPDATE lounge_rooms SET round_started_at=now()-interval '2 seconds',deadline_at=now()+interval '58 seconds' WHERE id=$1",[group]);
      const q=(await query('SELECT question FROM lounge_room_rounds WHERE room_id=$1 AND position=$2',[group,position])).rows[0].question;
      for(const user of ids.slice(0,3))await party.answerParty(user,group,position,q.correct_answer);
      const revealed=await party.partySnapshot(ids[3],group);assert.equal(revealed.room.phase,'reveal');assert.equal(revealed.reveal.answers.length,3);
      assert.ok(revealed.players.every(p=>p.correct_count===position+1));
      await query("UPDATE lounge_rooms SET advance_at=now()-interval '1 second' WHERE id=$1",[group]);
      const next=await party.partySnapshot(ids[0],group);assert.equal(next.room.status,position===2?'finished':'in_progress');
    }
    const done=await party.partySnapshot(ids[0],group);assert.ok(done.players.every(p=>p.score>=300&&p.score<=360));
  });
  await check('waiting-room host transfer and duel capacity are enforced',async()=>{
    const duel=await create(ids[0]);await party.joinParty(ids[1],duel);await assert.rejects(()=>party.joinParty(ids[2],duel),/full/);
    await party.leaveParty(ids[0],duel);const state=await party.partySnapshot(ids[1],duel);assert.equal(state.isHost,true);assert.equal(state.players.filter(p=>p.state==='joined').length,1);
  });
  await check('a player cannot occupy two waiting rooms',async()=>{
    const second=await create(ids[2]);await assert.rejects(()=>party.joinParty(ids[1],second),/other waiting room/);
    const old=rooms[rooms.length-2];await party.leaveParty(ids[1],old);await party.joinParty(ids[1],second);
  });
  await check('forfeit preserves submitted points and finished results are immutable',async()=>{
    const duel=await create(ids[3]);await start(duel,ids[3],ids[0]);
    const q=(await query('SELECT question FROM lounge_room_rounds WHERE room_id=$1 AND position=0',[duel])).rows[0].question;
    await party.answerParty(ids[3],duel,0,q.correct_answer);await party.leaveParty(ids[0],duel);
    const before=await party.partySnapshot(ids[3],duel);assert.equal(before.room.status,'finished');assert.ok(before.players.find(p=>p.user_id===ids[3]).score>=100);
    await party.leaveParty(ids[3],duel);const after=await party.partySnapshot(ids[3],duel);
    assert.equal(after.room.status,'finished');assert.deepEqual(after.players,before.players);
  });
  await check('only the submitting player can see their saved selection before reveal',async()=>{
    const duel=await create(ids[4]);await start(duel,ids[4],ids[5]);
    await party.answerParty(ids[4],duel,0,'private fixture selection');
    assert.equal((await party.partySnapshot(ids[4],duel)).myAnswer,'private fixture selection');
    const other=await party.partySnapshot(ids[5],duel),spectator=await party.partySnapshot(ids[6],duel);
    assert.equal(other.myAnswer,null);assert.equal(spectator.myAnswer,null);assert.equal(other.reveal,null);
    await party.leaveParty(ids[5],duel);
  });
  await check('expired invitations leave pending state and can be resent',async()=>{
    const group=await create(ids[6],'trivia','group','private');await party.inviteParty(ids[6],group,ids[7]);
    await query("UPDATE lounge_room_invites SET expires_at=now()-interval '1 second' WHERE room_id=$1",[group]);
    const state=await party.partySnapshot(ids[6],group);assert.equal(state.invitations[0].status,'expired');
    await party.inviteParty(ids[6],group,ids[7]);await party.joinParty(ids[7],group);await party.leaveParty(ids[7],group);await party.leaveParty(ids[6],group);
  });
  await check('switching to a board match settles already-submitted party points once',async()=>{
    const duel=await create(ids[8]);await start(duel,ids[8],ids[9]);
    const q=(await query('SELECT question FROM lounge_room_rounds WHERE room_id=$1 AND position=0',[duel])).rows[0].question;
    await party.answerParty(ids[8],duel,0,q.correct_answer);
    const game=(await query('INSERT INTO ttt_games(x_player_id,o_player_id) VALUES($1,$2) RETURNING id',[ids[10],ids[9]])).rows[0].id;games.push(game);
    await match.activateMatch('ttt',game,ids[9],true,true);
    const finished=await party.partySnapshot(ids[8],duel);assert.equal(finished.room.status,'finished');const score=finished.players.find(p=>p.user_id===ids[8]).score;assert.ok(score>=100);
    assert.equal((await party.partySnapshot(ids[8],duel)).players.find(p=>p.user_id===ids[8]).score,score);
    await query("UPDATE ttt_games SET status='draw' WHERE id=$1",[game]);
  });
  await check('concurrent contenders cannot exceed twelve group seats',async()=>{
    for(const room of rooms)await query("UPDATE lounge_rooms SET status='cancelled' WHERE id=$1",[room]);
    const group=await create(ids[0],'mixed','group');for(const user of ids.slice(1,11))await party.joinParty(user,group);
    const attempts=await Promise.allSettled([party.joinParty(ids[11],group),party.joinParty(ids[12],group)]);
    assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
    const state=await party.partySnapshot(ids[0],group);assert.equal(state.players.filter(p=>p.state==='joined').length,12);
  });
  await check('coding prompts and interaction windows use a shared contract',async()=>{
    const contract=require('../src/lib/party-contract.ts');assert.equal(contract.partyChoicePrompt({game_type:{slug:'coding'},content:{text:'What is 1 + 1?'},options:['1','2']}),'What is 1 + 1?');
    assert.equal(contract.partyChoicePrompt({game_type:{slug:'coding'},content:{},options:[]}),null);
    assert.equal(contract.partyRoundDuration('logic','easy'),32);assert.equal(contract.partyRoundDuration('typing','easy'),37);assert.equal(contract.partyRoundDuration('card_match','easy'),65);
    assert.match(contract.partyPerformanceFeedback('reaction',true),/catch/);
  });
  await check('generated mental-math reveals use the actual generated answer, not a bank placeholder',async()=>{
    for(const room of rooms)await query("UPDATE lounge_rooms SET status='cancelled' WHERE id=$1",[room]);
    const duel=await create(ids[0]);await start(duel,ids[0],ids[1]);
    const q=(await query('SELECT question FROM lounge_room_rounds WHERE room_id=$1 AND position=0',[duel])).rows[0].question;
    q.game_type.slug='mental_math';q.content={seed:'party-generated-answer-fixture'};q.correct_answer='placeholder';
    await query('UPDATE lounge_room_rounds SET question=$2::jsonb WHERE room_id=$1 AND position=0',[duel,JSON.stringify(q)]);
    assert.equal((await party.partySnapshot(ids[0],duel)).reveal,null);
    await query("UPDATE lounge_rooms SET phase='reveal',advance_at=now()+interval '1 minute' WHERE id=$1",[duel]);
    const expected=require('../src/lib/challenge-validation.ts').validateChallenge({id:q.id,slug:'mental_math',difficulty:q.difficulty,content:q.content,correctAnswer:q.correct_answer},'',0).correctAnswer;
    assert.equal((await party.partySnapshot(ids[0],duel)).reveal.correctAnswer,expected);assert.notEqual(expected,'placeholder');
  });
  console.log(`All ${checks} party checks passed.`);
}finally{await query('DELETE FROM lounge_rooms WHERE id=ANY($1::uuid[])',[rooms]);await query('DELETE FROM challenge_events WHERE game_id=ANY($1::uuid[])',[games]);await query('DELETE FROM match_results WHERE game_id=ANY($1::uuid[])',[games]);await query('DELETE FROM ttt_games WHERE id=ANY($1::uuid[])',[games]);await query('DELETE FROM activity_feed WHERE user_id=ANY($1::uuid[])',[ids]);await query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);await global.postgresPool?.end();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
