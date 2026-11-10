require('./register-typescript.cjs');
const Module=require('node:module'),originalLoad=Module._load;
Module._load=function(name,parent,main){if(name==='server-only')return {};return originalLoad.call(this,name,parent,main);};
const fs=require('node:fs'),assert=require('node:assert/strict');
Object.assign(process.env,require('dotenv').parse(fs.readFileSync('.env.local')));
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local database only');
const {query,withTransaction}=require('../src/server/database/connection.ts');
const pool=require('../src/features/missions/infrastructure/content-pool-queries.ts');
const profile=require('../src/features/players/infrastructure/profile-read.ts');
const {assembleMissionContent}=require('../src/features/missions/infrastructure/postgres-content-pool.ts');
const {readMissionQuestions}=require('../src/features/missions/infrastructure/postgres-session-read.ts');
async function main(){
  const rollback=new Error('Rollback fixtures');
  try {
    await assert.rejects(withTransaction(async()=>{
      const game=(await query('SELECT id FROM game_types ORDER BY id LIMIT 1')).rows[0];
      assert(game);
      const content={text:'Cleanup query fixture',nested:{value:1}};
      const inserted=await pool.insertPoolQuestions([{game_type_id:game.id,difficulty:'easy',content,options:['A','B'],correct_answer:'A',base_xp:100,is_active:true,pool_date:'2099-01-01'}]);
      assert.equal(inserted.error,null);assert.equal(inserted.data.length,1);
      assert.deepEqual(inserted.data[0].content,content);assert.deepEqual(inserted.data[0].options,['A','B']);
      const daily=await pool.findDailyPool('2099-01-01',[game.id],0,1000);
      assert.equal(daily.error,null);assert(daily.data.some(row=>row.id===inserted.data[0].id));
      assert.equal((await pool.findDailyPool('2099-01-01',[],0,1000)).data.length,0);
      assert.equal((await pool.insertPoolQuestions([])).data.length,0);
      const user=(await query("SELECT id,total_xp,full_name,department FROM profiles WHERE role <> 'admin' LIMIT 1")).rows[0];
      if(user){
        assert.equal((await profile.findProfile(user.id)).data.id,user.id);
        assert(Array.isArray(await profile.findMissionGameStats(user.id)));
        assert((await profile.countHigherXp(user.total_xp)).count>=0);
        assert((await profile.countDepartmentEqualXpBeforeName(user.department,user.total_xp,user.full_name)).count>=0);
        assert(Array.isArray((await profile.findChessHistory(user.id,['finished'])).data));
      }
      const actor=(await query("INSERT INTO users(email,password_hash) VALUES($1,'fixture') RETURNING id,email",[`cleanup-${require('node:crypto').randomUUID()}@office.test`])).rows[0];
      await query("INSERT INTO profiles(id,email,full_name,department,timezone) VALUES($1,$2,'Cleanup fixture','General','Asia/Dubai')",[actor.id,actor.email]);
      const games=(await query('SELECT * FROM game_types WHERE is_active=true ORDER BY id')).rows;
      const result=await assembleMissionContent({user:actor,profile:{department:'General',timezone:'Asia/Dubai',session_time_limit_minutes:null,daily_time_limit_minutes:null},today:'2099-01-02',settings:{daily_game_count:games.length,cooldown_hours:24,daily_time_limit_minutes:15},games});
      assert.equal(result.error,undefined,JSON.stringify(result));
      const assigned=(await query('SELECT DISTINCT q.game_type_id FROM session_questions sq JOIN questions q ON q.id=sq.question_id WHERE sq.session_id=$1',[result.session.id])).rows;
      assert.equal(assigned.length,games.length);
      const playable=await readMissionQuestions(result.session.id,actor.id);
      assert(playable.length>=games.length);
      assert(playable.every(item=>item.question.correct_answer===''));
      console.log(`PASS actual mission content assembly for all ${games.length} active games inside rollback fixture.`);
      throw rollback;
    }),error=>error===rollback);
    console.log('PASS explicit mission pool queries, JSON inserts, empty pools, profile reads/ranking and fixture rollback.');
  }finally{await global.postgresPool?.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
