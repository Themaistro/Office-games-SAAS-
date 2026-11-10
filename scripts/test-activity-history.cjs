require('./register-typescript.cjs');
const Module=require('node:module'),load=Module._load;Module._load=function(name,...args){return name==='server-only'?{}:load.call(this,name,...args);};
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
Object.assign(process.env,require('dotenv').parse(fs.readFileSync('.env.local')));
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw new Error('Local test only');
const {withTransaction}=require('../src/server/database/connection.ts');
const {selectActivityFeedForGET}=require('../src/features/reporting/infrastructure/api-activity-route-queries.ts');
async function main(){
  const marker=new Error('Rollback historical fixture');
  try{
    await assert.rejects(withTransaction(async client=>{
      const ids=[randomUUID(),randomUUID()];
      for(const id of ids){await client.query('INSERT INTO users(id,email) VALUES($1,$2)',[id,`history-${id}@office.test`]);await client.query("INSERT INTO profiles(id,email,full_name) SELECT id,email,'History QA' FROM users WHERE id=$1",[id]);}
      await client.query("INSERT INTO activity_feed(user_id,activity_type,metadata,created_at) SELECT $1,'presence','{\"description\":\"History QA\"}'::jsonb,'2020-01-01'::timestamptz+n*interval '1 second' FROM generate_series(1,10000)n",[ids[0]]);
      let offset=0;
      for(const [table,a,b,status]of [['chess_games','white_player_id','black_player_id','white_won'],['ttt_games','x_player_id','o_player_id','x_won'],['connect_four_games','red_player_id','yellow_player_id','red_won']]){
        await client.query(`INSERT INTO ${table}(${a},${b},status,created_at,updated_at) SELECT $1,$2,$3,'2019-01-01'::timestamptz+n*interval '1 second','2030-01-01'::timestamptz+(n+$4)*interval '1 second' FROM generate_series(1,3000)n`,[...ids,status,offset]);offset+=10000;
      }
      let sql;await selectActivityFeedForGET([],{query:async text=>{sql=text;return {rows:[]};}});
      const baseline=sql.replaceAll(/ORDER BY (?:created_at|updated_at) DESC NULLS LAST LIMIT 30\)/g,')');
      const expected=(await client.query(baseline)).rows,actual=(await client.query(sql)).rows;
      assert.deepEqual(actual.map(row=>row.id),expected.map(row=>row.id),'Per-source limits must preserve the actual newest 30 events');
      const oldPlan=(await client.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+baseline)).rows[0]['QUERY PLAN'][0];
      const plan=(await client.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql)).rows[0]['QUERY PLAN'][0];
      fs.mkdirSync('output',{recursive:true});
      const report={fixtureRows:19000,returned:actual.length,baselineExecutionMs:oldPlan['Execution Time'],boundedExecutionMs:plan['Execution Time'],boundedSharedHitBlocks:plan.Plan['Shared Hit Blocks'],boundedSharedReadBlocks:plan.Plan['Shared Read Blocks'],plan};
      fs.writeFileSync('output/activity-history-plan.json',JSON.stringify(report,null,2));
      console.log(JSON.stringify({fixtureRows:report.fixtureRows,returned:actual.length,baselineExecutionMs:report.baselineExecutionMs,boundedExecutionMs:report.boundedExecutionMs,cleanup:'transaction rollback'}));
      throw marker;
    }),error=>error===marker);
  }finally{await global.postgresPool?.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
