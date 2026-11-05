const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg'),bcrypt=require('bcryptjs'),ts=require('typescript');
Object.assign(process.env,require('dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env.local'))));
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local QA only');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const generators=require('../src/features/content/domain/game-content.ts');
const client=new Client({connectionString:process.env.DATABASE_URL});
async function main(){await client.connect();try{
 await client.query('BEGIN');
 const password='Local-Gameplay-QA-2026!';
 const department=(await client.query('SELECT name FROM departments WHERE is_active=true ORDER BY name LIMIT 1')).rows[0]?.name;
 if(!department)throw new Error('An active department is required');
 const games=(await client.query('SELECT * FROM game_types WHERE is_active=true ORDER BY name')).rows;
 const words=(await client.query('SELECT * FROM master_word_bank')).rows,typing=(await client.query('SELECT * FROM master_typing_bank')).rows,odd=(await client.query('SELECT * FROM master_odd_object_bank')).rows;
 const trivia=(await client.query('SELECT t.* FROM master_trivia_bank t JOIN trivia_review_sources r ON r.question_id=t.id')).rows;
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 for(const [index,email] of ['qa-gameplay-a@office.test','qa-gameplay-b@office.test'].entries()){
  let user=(await client.query('SELECT id FROM users WHERE email=$1',[email])).rows[0];
  if(!user){user=(await client.query('INSERT INTO users(email,password_hash,email_verified_at) VALUES($1,$2,now()) RETURNING id',[email,await bcrypt.hash(password,12)])).rows[0];await client.query("INSERT INTO profiles(id,email,full_name,department,position,timezone,session_time_limit_minutes) VALUES($1,$2,$3,$4,'Local QA','Asia/Dubai',120)",[user.id,email,`Gameplay QA ${index?'B':'A'}`,department]);}
  const existing=await client.query('SELECT id FROM daily_sessions WHERE user_id=$1 AND date=$2 AND is_completed=false',[user.id,date]);
  if(existing.rows.length){console.log(email,'existing QA mission retained');continue;}
  const session=(await client.query("INSERT INTO daily_sessions(user_id,date,allowed_duration_seconds,status) VALUES($1,$2,7200,'in_progress') RETURNING id",[user.id,date])).rows[0];let order=0;
  for(const difficulty of ['easy','medium','hard'])for(const game of games){let value;
   switch(game.slug){case 'trivia':case 'coding':value=generators.generateTrivia(trivia,1,trivia[0]?.difficulty??'easy',0)[0];break;
   case 'memory':value=generators.generateMemory(1,difficulty)[0];break;
   case 'logic':value=generators.generateSequence(1,difficulty)[0];break;
   case 'typing':value=generators.generateTypingChallenge(typing,1,difficulty,0)[0];break;
   case 'odd_object':value=generators.generateOddObject(odd,1,difficulty,0)[0];break;
   case 'unscramble':value=generators.generateWordUnscramble(words,1,difficulty,0)[0];break;
   case 'word':value=generators.generateMissingLetters(words,1,difficulty,0)[0];break;
   case 'math':value=generators.generateTargetNumber(1,difficulty)[0];break;
   case 'mental_math':value=generators.generateMentalMath(1,difficulty)[0];break;
   case 'card_match':value=generators.generateCardMatch(1,difficulty)[0];break;
   case 'sudoku_lite':value=generators.generateSudokuLite(1,difficulty)[0];break;
   default:value={content:{seed:`qa:${email}:${game.slug}:${difficulty}`},correctAnswer:'none',options:[]};
   }
   if(!value)throw new Error(`No fixture for ${game.slug}`);
   value.content={...value.content,qaFixture:true};
   const q=(await client.query('INSERT INTO questions(game_type_id,difficulty,content,options,correct_answer,base_xp,is_active) VALUES($1,$2,$3::jsonb,$4::jsonb,$5,100,false) RETURNING id',[game.id,difficulty,JSON.stringify(value.content),JSON.stringify(value.options??[]),value.correctAnswer])).rows[0];
   await client.query('INSERT INTO session_questions(session_id,question_id,order_index) VALUES($1,$2,$3)',[session.id,q.id,order++]);
  }
  console.log(email,session.id,order,'isolated QA questions');
 }
 await client.query('COMMIT');console.log('QA accounts created locally; fixtures are inactive in normal question pools.');
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
