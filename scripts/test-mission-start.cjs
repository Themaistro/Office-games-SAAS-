const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict'),bcrypt=require('bcryptjs');
const root=path.join(__dirname,'..');Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(root,'.env.local'))));if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local QA only');delete process.env.ABLY_API_KEY;
let currentUser;const load=Module._load,resolve=Module._resolveFilename;Module._load=function(name,parent,main){if(name==='server-only')return {};if(name==='@/features/identity/infrastructure/authentication')return {getCurrentUser:async()=>currentUser};if(name==='next/cache')return {revalidatePath(){}};return load.call(this,name,parent,main);};Module._resolveFilename=function(name,parent,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,'src',name.slice(2)):name,parent,...args);};require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {query}=require('../src/server/database/connection.ts'),actions=require('../src/app/play/actions.ts');
async function main(){try{
 const count=(await query('SELECT daily_game_count FROM system_settings WHERE id=1')).rows[0].daily_game_count;
 for(const suffix of ['c','d']){
  const email=`qa-gameplay-${suffix}@office.test`;let user=(await query('SELECT id,email FROM users WHERE email=$1',[email])).rows[0];
  if(!user){user=(await query('INSERT INTO users(email,password_hash,email_verified_at) VALUES($1,$2,now()) RETURNING id,email',[email,await bcrypt.hash('Local-Gameplay-QA-2026!',12)])).rows[0];const department=(await query('SELECT name FROM departments WHERE is_active=true ORDER BY name LIMIT 1')).rows[0].name;await query("INSERT INTO profiles(id,email,full_name,department,position,timezone,session_time_limit_minutes) VALUES($1,$2,$3,$4,'Local QA','Asia/Dubai',120)",[user.id,email,`Gameplay QA ${suffix.toUpperCase()}`,department]);}
  currentUser=user;
  const results=await Promise.all([actions.startDailySession(),actions.startDailySession()]);for(const result of results)assert(!result.error,JSON.stringify(result));assert.equal(results[0].session.id,results[1].session.id,'Concurrent starts created multiple sessions');
  const session=results[0].session;
  const rows=(await query('SELECT sq.*,q.difficulty,q.content,g.id AS game_id,g.slug,g.easy_rounds,g.medium_rounds,g.hard_rounds FROM session_questions sq JOIN questions q ON q.id=sq.question_id JOIN game_types g ON g.id=q.game_type_id WHERE sq.session_id=$1 ORDER BY sq.order_index',[session.id])).rows;
  const regular=rows.filter(row=>!row.content?.isCompanyTrivia);assert.equal(new Set(regular.map(row=>row.game_id)).size,count);
  for(const gameId of new Set(regular.map(row=>row.game_id))){const gameRows=regular.filter(row=>row.game_id===gameId);for(const difficulty of ['easy','medium','hard'])assert.equal(gameRows.filter(row=>row.difficulty===difficulty).length,gameRows[0][difficulty+'_rounds'],`${gameRows[0].slug}/${difficulty}`);}
  const visible=await actions.fetchSessionQuestions(session.id);assert.equal(visible.length,rows.length);assert(visible.every(row=>row.question.correct_answer===''));
  const resumed=await actions.startDailySession();assert.equal(resumed.session.id,session.id);assert.deepEqual((await actions.fetchSessionQuestions(session.id)).map(row=>row.question_id),visible.map(row=>row.question_id));
  console.log(`PASS ${suffix.toUpperCase()}: actual engine generated ${count} games, ${rows.length} rounds; exact configuration, concurrent start, hidden answers and stable resume verified.`);
 }
}finally{await global.postgresPool?.end();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
