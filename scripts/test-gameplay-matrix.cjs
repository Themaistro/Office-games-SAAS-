const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local'))));if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local QA only');delete process.env.ABLY_API_KEY;
let currentUser;const load=Module._load,resolve=Module._resolveFilename;
Module._load=function(name,parent,main){if(name==='server-only')return {};if(name==='@/features/identity/infrastructure/authentication')return {getCurrentUser:async()=>currentUser};if(name==='next/cache')return {revalidatePath(){}};if(name==='next/navigation')return {redirect(location){throw new Error(location);}};return load.call(this,name,parent,main);};
Module._resolveFilename=function(name,parent,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...args);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {query}=require('../src/server/database/connection.ts'),actions=require('../src/app/play/actions.ts'),{seededNumber,seededShuffle}=require('../src/features/challenges/domain/challenge-seed.ts'),{generateSudoku}=require('../src/features/challenges/domain/sudoku.ts');
function successful(q){const seed=String(q.content.seed||q.question_id),d=q.difficulty;switch(q.slug){
 case 'reaction':return ['230ms',0.23];
 case 'stroop':{const colors=['RED','BLUE','GREEN','YELLOW','PURPLE','ORANGE','PINK','CYAN'];const word=seededNumber(seed,'word',8);let font=seededNumber(seed,'font',8);if(font===word)font=(font+1)%8;return [colors[font],2];}
 case 'sequence':return [JSON.stringify(seededShuffle(Array.from({length:d==='easy'?9:d==='medium'?16:25},(_,i)=>i),seed,'sequence-positions').slice(0,d==='easy'?4:d==='medium'?6:8)),3];
 case 'odd_object':return [String(seededNumber(seed,'odd-position',(d==='easy'?5:d==='medium'?7:9)**2)),3];
 case 'sudoku_lite':return [JSON.stringify(generateSudoku(d,seed).solution),20];
 case 'card_match':{const pending=new Map(),pairs=[];q.content.cards.forEach((card,index)=>{if(pending.has(card.emoji)){pairs.push([pending.get(card.emoji),index]);pending.delete(card.emoji);}else pending.set(card.emoji,index);});return [JSON.stringify(pairs),8];}
 case 'typing':return [q.content.text,15];
 case 'memory':return [q.content.text,3];
 case 'mental_math':{const op=seededNumber(seed,'operation',3),a=seededNumber(seed,'a',op===2?10:50)+(op===0?10:op===1?20:2),b=seededNumber(seed,'b',op===0?50:op===1?20:10)+(op===0?10:op===1?1:2);return [String(op===0?a+b:op===1?a-b:a*b),3];}
 default:return [q.correct_answer,3];}}
async function main(){let checks=0;try{
 const user=(await query("SELECT id,email FROM users WHERE email='qa-gameplay-b@office.test'")).rows[0];assert(user,'Run setup-gameplay-qa.cjs first');currentUser=user;
 const rows=(await query("SELECT sq.id,sq.session_id,q.id AS question_id,q.content,q.difficulty,q.correct_answer,g.slug FROM session_questions sq JOIN daily_sessions ds ON ds.id=sq.session_id JOIN questions q ON q.id=sq.question_id JOIN game_types g ON g.id=q.game_type_id WHERE ds.user_id=$1 AND ds.status='in_progress' ORDER BY sq.order_index",[user.id])).rows;assert.equal(rows.length,45);
 assert(rows.every(row=>row.content?.qaFixture===true),'Refusing to reset a non-QA mission');
 await query("UPDATE daily_sessions SET created_at=now(),allowed_duration_seconds=7200 WHERE id=$1 AND user_id=$2",[rows[0].session_id,user.id]);
 const reset=async(id)=>query('UPDATE session_questions SET is_completed=false,outcome=null,earned_xp=0,time_spent_seconds=0,hint_used=false WHERE id=$1',[id]);
 for(const q of rows){const [answer,time]=successful(q);
  for(const [name,submitted,options,correct,outcome]of [['correct',answer,{},true,'correct'],['wrong','Definitely wrong QA input',{customIsCorrect:true,isPerfect:true},false,'incorrect'],['timeout',"Time's up!",{},false,'timed_out'],['skip',answer,{isSkipped:true},false,'skipped']]){
   await reset(q.id);const result=await actions.submitAnswer(q.id,submitted,time,options);assert.equal(result.isCorrect,correct,`${q.slug}/${q.difficulty}/${name}: ${JSON.stringify(result)}`);
   const saved=(await query('SELECT outcome,earned_xp,is_completed FROM session_questions WHERE id=$1',[q.id])).rows[0];assert.equal(saved.outcome,outcome);assert(saved.is_completed);assert.equal(saved.earned_xp,name==='skip'?-50:name==='correct'?result.xpEarned:0);checks++;
  }
  await reset(q.id);const attempts=await Promise.all([actions.submitAnswer(q.id,answer,time),actions.submitAnswer(q.id,answer,time)]);assert.equal(attempts.filter(result=>result.success).length,1);checks++;
  console.log(`PASS ${q.slug}/${q.difficulty}: correct, wrong, timeout, skip, duplicate submission`);
 }
 await reset(rows[0].id);await reset(rows[1].id);
 assert.match((await actions.submitAnswer(rows[1].id,...successful(rows[1]))).error,/current challenge/);checks++;
 await assert.rejects(()=>actions.useMissionHint(rows[1].id),/current challenge/);checks++;
 const savedUser=currentUser;currentUser=undefined;await assert.rejects(()=>actions.submitAnswer(rows[0].id,...successful(rows[0])),/Unauthorized/);checks++;
 currentUser=(await query("SELECT id,email FROM users WHERE email='qa-gameplay-a@office.test'")).rows[0];await assert.rejects(()=>actions.submitAnswer(rows[0].id,...successful(rows[0])),/Unauthorized/);checks++;currentUser=savedUser;
 await query('UPDATE session_questions SET is_completed=true,hint_used=false WHERE id=ANY($1::uuid[])',[rows.map(row=>row.id)]);
 const typing=rows.find(row=>row.slug==='typing');await reset(typing.id);await assert.rejects(()=>actions.useMissionHint(typing.id),/not available/);checks++;await query('UPDATE session_questions SET is_completed=true WHERE id=$1',[typing.id]);
 for(const [index,q]of rows.filter(row=>['logic','trivia','word','math'].includes(row.slug)).slice(0,4).entries()){
  await reset(q.id);if(index<3){const hint=await actions.useMissionHint(q.id);assert.equal(hint.remaining,2-index);await assert.rejects(()=>actions.useMissionHint(q.id),/Hint unavailable|No hints/);checks+=2;}else{await assert.rejects(()=>actions.useMissionHint(q.id),/No hints/);checks++;}await query('UPDATE session_questions SET is_completed=true WHERE id=$1',[q.id]);
 }
 console.log(`Passed ${checks} real PostgreSQL/server-action scenarios across all 15 game types and 3 difficulties, including order, ownership and hint-budget guards. These are synthetic QA attempts, not human difficulty evidence.`);
}finally{await global.postgresPool?.end();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
