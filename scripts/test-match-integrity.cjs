// Exercise real PostgreSQL locks and server actions using disposable local fixtures.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
Object.assign(process.env, require('dotenv').parse(fs.readFileSync(path.join(root, '.env.local'))));
if(process.env.TEST_DATABASE_URL)process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('These integration tests only run against local PostgreSQL');
delete process.env.ABLY_API_KEY;
let currentUser;
const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;
Module._load = function (name, parent, main) {
  if (name === 'server-only') return {};
  if ((name === '@/features/identity/infrastructure/authentication' || name === './infrastructure/authentication')) return { getCurrentUser: async () => currentUser };
  if (name === 'next/cache') return { revalidatePath() {} };
  if (name === 'next/navigation') return { redirect(location) { throw Object.assign(new Error('REDIRECT'), { location }); } };
  return originalLoad.call(this, name, parent, main);
};
Module._resolveFilename = function (name, parent, ...args) {
  if (name.startsWith('@/')) name = path.join(root, 'src', name.slice(2));
  return originalResolve.call(this, name, parent, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const { query, withTransaction } = require('../src/server/database/connection.ts');
const { activateMatch, settleMatch, createWaitingMatch, cancelWaitingMatch } = require('../src/features/lounge/infrastructure/postgres-match-service.ts');
const chessActions = require('../src/app/dashboard/chess/actions.ts');
const tttActions = require('../src/app/dashboard/ttt/actions.ts');
const missionActions = require('../src/app/play/actions.ts');
const { Chess } = require('chess.js');
const people = [randomUUID(), randomUUID(), randomUUID()];
const games = [];
const questionFixtureId=randomUUID();
let checks = 0;
async function check(name, fn) { await fn(); console.log(`PASS ${name}`); checks++; }
async function createGame(type, a, b, status='waiting') {
  const fields = type === 'chess' ? ['chess_games', 'white_player_id','black_player_id'] : ['ttt_games','x_player_id','o_player_id'];
  const { rows } = await query(`INSERT INTO ${fields[0]}(${fields[1]},${fields[2]},status) VALUES($1,$2,$3) RETURNING id`, [a,b,status]);
  games.push([fields[0], rows[0].id]); return rows[0].id;
}
async function closeFixtures() { for (const [table,id] of games) await query(`UPDATE ${table} SET status='draw' WHERE id=$1`,[id]); }
async function main() {
  try {
    for (const [i,id] of people.entries()) {
      const email=`match-audit-${id}@example.invalid`;
      await query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[id,email,'not-a-login-hash']);
      await query('INSERT INTO profiles(id,email,full_name,lounge_lp) VALUES($1,$2,$3,100)',[id,email,`Audit fixture ${i}`]);
    }
    await check('completed invitations cannot reopen', async()=>{ const id=await createGame('chess',people[0],people[1],'draw'); await assert.rejects(()=>activateMatch('chess',id,people[1],true),/no longer available/); });
    await check('concurrent acceptance permits only one active game across game types', async()=>{
      const a=await createGame('chess',people[0],people[1]), b=await createGame('ttt',people[2],people[1]);
      const results=await Promise.allSettled([activateMatch('chess',a,people[1],true),activateMatch('ttt',b,people[1],true)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);await closeFixtures();
    });
    await check('active challenger cannot start a second match',async()=>{
      await createGame('ttt',people[0],people[2],'in_progress');const id=await createGame('chess',people[0],people[1]);
      await assert.rejects(()=>activateMatch('chess',id,people[1],true),/already in a match/);await closeFixtures();
    });
    await check('settlement is idempotent and awards Lounge LP once',async()=>{
      const id=await createGame('ttt',people[0],people[1],'in_progress');
      await withTransaction(async client=>{const {rows}=await client.query('SELECT * FROM ttt_games WHERE id=$1 FOR UPDATE',[id]);await settleMatch(client,'ttt',rows[0],'x_won','test');await settleMatch(client,'ttt',rows[0],'x_won','test');});
      const {rows}=await query('SELECT lounge_lp FROM profiles WHERE id=$1',[people[0]]);assert.equal(rows[0].lounge_lp,125);
      const ledger=await query('SELECT * FROM match_results WHERE game_id=$1',[id]);assert.equal(ledger.rows.length,1);
    });
    await check('checkmate settles the winner and rating ledger',async()=>{
      const id=await createGame('chess',people[0],people[1],'in_progress');const board=new Chess();board.move('f3');board.move('e5');board.move('g4');
      await query('UPDATE chess_games SET pgn=$1,fen=$2,last_move_timestamp=now() WHERE id=$3',[board.pgn(),board.fen(),id]);board.move('Qh4#');
      currentUser={id:people[1],email:'fixture@example.invalid'};await chessActions.updateChessGameState(id,board.pgn(),board.fen(),'white_won','w');
      const {rows}=await query('SELECT status,winner_id FROM chess_games WHERE id=$1',[id]);assert.equal(rows[0].status,'black_won');assert.equal(rows[0].winner_id,people[1]);
      assert.equal((await query('SELECT * FROM match_results WHERE game_id=$1',[id])).rows.length,1);
    });
    await check('late checkmate loses on time rather than overriding the clock',async()=>{
      const id=await createGame('chess',people[0],people[1],'in_progress');const board=new Chess();board.move('f3');board.move('e5');board.move('g4');
      await query("UPDATE chess_games SET pgn=$1,fen=$2,black_time_ms=1,last_move_timestamp=now()-interval '1 second' WHERE id=$3",[board.pgn(),board.fen(),id]);board.move('Qh4#');
      currentUser={id:people[1],email:'fixture@example.invalid'};await chessActions.updateChessGameState(id,board.pgn(),board.fen(),'black_won','w');
      assert.equal((await query('SELECT status FROM chess_games WHERE id=$1',[id])).rows[0].status,'white_won');
    });
    await check('draw requires the second player to accept',async()=>{
      const id=await createGame('chess',people[0],people[1],'in_progress');currentUser={id:people[0]};await chessActions.drawChessGame(id);
      assert.equal((await query('SELECT status FROM chess_games WHERE id=$1',[id])).rows[0].status,'in_progress');
      currentUser={id:people[1]};await chessActions.drawChessGame(id);assert.equal((await query('SELECT status FROM chess_games WHERE id=$1',[id])).rows[0].status,'draw');
    });
    await check('outsider cannot resign a match',async()=>{
      const id=await createGame('ttt',people[0],people[1],'in_progress');currentUser={id:people[2]};await assert.rejects(()=>tttActions.resignTttGame(id),/Not a player/);await closeFixtures();
    });
    await check('repeated resignation cannot duplicate the result',async()=>{
      const id=await createGame('ttt',people[0],people[1],'in_progress');currentUser={id:people[0]};await Promise.all([tttActions.resignTttGame(id),tttActions.resignTttGame(id)]);
      assert.equal((await query('SELECT * FROM match_results WHERE game_id=$1',[id])).rows.length,1);
    });
    await check('confirmed invite replacement resigns the old game atomically',async()=>{
      await closeFixtures();
      const old=await createGame('ttt',people[0],people[1],'in_progress');
      const next=await createGame('chess',people[2],people[0]);
      await activateMatch('chess',next,people[0],true,true);
      assert.equal((await query('SELECT status FROM ttt_games WHERE id=$1',[old])).rows[0].status,'o_won');
      assert.equal((await query('SELECT status FROM chess_games WHERE id=$1',[next])).rows[0].status,'in_progress');
      assert.equal((await query('SELECT reason FROM match_results WHERE game_id=$1',[old])).rows[0].reason,'resigned_to_accept_invite');
      await closeFixtures();
    });
    await check('mission ownership, hints, expiry and final settlement stay authoritative',async()=>{
      const question=(await query("INSERT INTO questions(id,game_type_id,difficulty,content,options,correct_answer,base_xp,is_active) SELECT $1,id,'easy',$2::jsonb,$3::jsonb,'Correct',100,true FROM game_types WHERE slug='trivia' LIMIT 1 RETURNING id",[questionFixtureId,JSON.stringify({question:'Which answer completes this test fixture?'}),JSON.stringify(['Correct','Incorrect','Other','None'])])).rows[0];
      assert.ok(question,'The migrated game catalog must contain Trivia');
      const session=(await query("INSERT INTO daily_sessions(user_id,date,allowed_duration_seconds) VALUES($1,current_date,600) RETURNING id",[people[0]])).rows[0].id;
      const sq=(await query('INSERT INTO session_questions(session_id,question_id,order_index) VALUES($1,$2,0) RETURNING id',[session,question.id])).rows[0].id;
      currentUser={id:people[1]};assert.deepEqual(await missionActions.fetchSessionQuestions(session),[]);
      await assert.rejects(()=>missionActions.useMissionHint(sq),/not active/);
      currentUser={id:people[0]};
      const visible=await missionActions.fetchSessionQuestions(session);assert.equal(visible[0].question.correct_answer,'');
      await missionActions.useMissionHint(sq);
      assert.equal((await query('SELECT hint_used FROM session_questions WHERE id=$1',[sq])).rows[0].hint_used,true);
      assert.ok((await missionActions.endSession(session)).error,'Cannot finish unanswered mission');
      await query("UPDATE daily_sessions SET created_at=now()-interval '20 minutes' WHERE id=$1",[session]);
      await assert.rejects(()=>missionActions.useMissionHint(sq),/time has ended/);
      assert.equal((await missionActions.endSession(session,'expired')).outcome,'expired');
      const second=(await query("INSERT INTO daily_sessions(user_id,date,allowed_duration_seconds) VALUES($1,current_date,600) RETURNING id",[people[0]])).rows[0].id;
      await query("INSERT INTO session_questions(session_id,question_id,order_index,is_completed,outcome,earned_xp) VALUES($1,$2,0,true,'correct',100)",[second,question.id]);
      const before=(await query('SELECT total_xp FROM profiles WHERE id=$1',[people[0]])).rows[0].total_xp;
      await Promise.all([missionActions.endSession(second),missionActions.endSession(second)]);
      const after=(await query('SELECT total_xp FROM profiles WHERE id=$1',[people[0]])).rows[0].total_xp;
      assert.equal(after-before,100);
      assert.equal((await query("SELECT count(*)::int AS n FROM activity_feed WHERE user_id=$1 AND activity_type='mission'",[people[0]])).rows[0].n,1);
    });
    await check('shared creation rejects malformed targets and concurrent duplicate invites',async()=>{
      await closeFixtures();
      await assert.rejects(()=>createWaitingMatch('ttt',people[0],{targetId:''}),/Invalid/);
      await assert.rejects(()=>createWaitingMatch('chess',people[0],{timeMs:-1}),/clock/);
      const results=await Promise.allSettled([createWaitingMatch('ttt',people[0],{targetId:people[1]}),createWaitingMatch('ttt',people[0],{targetId:people[1]})]);
      const created=results.filter(result=>result.status==='fulfilled');
      for(const result of created)games.push(['ttt_games',result.value.id]);
      assert.equal(created.length,1);
      await closeFixtures();
    });
    await check('creating a public lobby preserves private invitations and the selected side',async()=>{
      const invitation=await createWaitingMatch('ttt',people[1],{targetId:people[0]});games.push(['ttt_games',invitation.id]);
      const lobby=await createWaitingMatch('chess',people[0],{firstSeat:false});games.push(['chess_games',lobby.id]);
      assert.equal((await query('SELECT status FROM ttt_games WHERE id=$1',[invitation.id])).rows[0].status,'waiting');
      const row=(await query('SELECT white_player_id,black_player_id FROM chess_games WHERE id=$1',[lobby.id])).rows[0];
      assert.equal(row.white_player_id,null);assert.equal(row.black_player_id,people[0]);
      const repeated=await Promise.all([createWaitingMatch('chess',people[0],{firstSeat:false}),createWaitingMatch('chess',people[0],{firstSeat:false})]);
      assert.ok(repeated.every(item=>item.id===lobby.id),'Repeated creation reuses the same public lobby');
    });
    await check('all registered games cancel once and serialize cancellation against acceptance',async()=>{
      for(const [type,table]of [['chess','chess_games'],['ttt','ttt_games'],['connect-four','connect_four_games']]){
        await closeFixtures();
        const first=await createWaitingMatch(type,people[0],{targetId:people[1]});games.push([table,first.id]);
        assert.equal(await cancelWaitingMatch(type,first.id,people[2]),false,'Outsider cancelled an invitation');
        const duplicates=await Promise.all([1,2,3].map(()=>cancelWaitingMatch(type,first.id,people[0])));
        assert.equal(duplicates.filter(Boolean).length,1);
        assert.equal((await query("SELECT count(*)::int AS count FROM challenge_events WHERE game_id=$1 AND event_type='cancelled'",[first.id])).rows[0].count,1);
        const racing=await createWaitingMatch(type,people[0],{targetId:people[1]});games.push([table,racing.id]);
        const results=await Promise.allSettled([activateMatch(type,racing.id,people[1],true),cancelWaitingMatch(type,racing.id,people[0])]);
        const cancelled=results[1].status==='fulfilled'&&results[1].value;
        const row=(await query(`SELECT status FROM ${table} WHERE id=$1`,[racing.id])).rows[0];
        if(cancelled)assert.equal(row,undefined);else assert.equal(row?.status,'in_progress');
      }
    });
    await check('all board resignations return explicit results and reject spectators',async()=>{
      const actions=[['chess','chess_games',chessActions.resignChessGame,'black_won'],['ttt','ttt_games',require('../src/app/dashboard/ttt/actions.ts').resignTttGame,'o_won'],['connect-four','connect_four_games',require('../src/app/dashboard/connect-four/actions.ts').resignConnectFourGame,'yellow_won']];
      for(const [type,table,resign,status]of actions){
        await closeFixtures();const game=await createWaitingMatch(type,people[0],{targetId:people[1]});games.push([table,game.id]);await activateMatch(type,game.id,people[1],true);
        currentUser={id:people[2]};await assert.rejects(()=>resign(game.id),/Not a player/);
        currentUser={id:people[0]};const result=await resign(game.id);assert.equal(result.status,status);assert.equal(result.reason,'resignation');const repeated=await resign(game.id);assert.equal(repeated.reason,'resignation');
        assert.equal((await query('SELECT count(*)::int AS count FROM match_results WHERE game_id=$1',[game.id])).rows[0].count,1);
      }
    });
    assert.equal(chessActions.processChessGameEnd,undefined); console.log(`All ${checks} integrity checks passed.`);
  } finally {
    const ids=games.map(([,id])=>id);
    await query('DELETE FROM match_results WHERE game_id=ANY($1::uuid[])',[ids]);
    await query('DELETE FROM challenge_events WHERE game_id=ANY($1::uuid[])',[ids]);
    await query('DELETE FROM activity_feed WHERE user_id=ANY($1::uuid[])',[people]);
    for(const [table,id]of games)await query(`DELETE FROM ${table} WHERE id=$1`,[id]);
    await query('DELETE FROM profiles WHERE id=ANY($1::uuid[])',[people]);
    await query('DELETE FROM users WHERE id=ANY($1::uuid[])',[people]);
    await query('DELETE FROM questions WHERE id=$1',[questionFixtureId]);
    await global.postgresPool?.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
