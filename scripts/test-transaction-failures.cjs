require('./register-typescript.cjs');
const assert=require('node:assert/strict');
process.env.OFFICE_GAMES_COMPANY_ID=process.env.NEXT_PUBLIC_OFFICE_GAMES_COMPANY_ID='00000000-0000-4000-8000-000000000001';
let released,mode='rollback-fails';
const original=new Error('original operation failure');
const client={
  query:async sql=>{
    if(sql.includes('deployment_identity'))return {rows:[{company_id:process.env.OFFICE_GAMES_COMPANY_ID}]};
    if(sql==='ROLLBACK'&&mode==='rollback-fails')throw Object.assign(new Error('secret rollback details'),{code:'08006'});
    if(sql==='COMMIT'&&mode==='commit-aborted')return {command:'ROLLBACK',rows:[]};
    return {command:sql.split(' ')[0],rows:[]};
  },release:error=>{released=error;}
};
global.postgresPool={connect:async()=>client,totalCount:1,idleCount:0,waitingCount:0};
const {withTransaction}=require('../src/server/database/connection.ts');
async function main(){
  const logs=[],old=console.error;console.error=(...args)=>logs.push(JSON.stringify(args));
  try{
    await assert.rejects(withTransaction(async()=>{throw original;}),error=>error===original);
    assert(released instanceof Error,'Failed rollback must discard the connection');
    assert(!logs.join('').includes('secret rollback details'),'Logs must not expose raw driver messages');
    mode='commit-aborted';released=undefined;
    // A separate physical connection avoids reusing a deliberately discarded one.
    global.postgresPool.connect=async()=>({...client,release:client.release});
    await assert.rejects(withTransaction(async()=>42),/did not commit/);
    console.log('PASS original error preserved, rollback-failed connection discarded, safe diagnostic code and aborted COMMIT rejected.');
  }finally{console.error=old;delete global.postgresPool;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
