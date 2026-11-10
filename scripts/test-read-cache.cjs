require('./register-typescript.cjs');
const assert=require('node:assert/strict');
const {createShortReadCache}=require('../src/server/cache/short-lived.ts');
async function main(){
  let calls=0,now=1000;const realNow=Date.now;Date.now=()=>now;
  const read=createShortReadCache(2000,2),load=async()=>{calls++;return {version:calls};};
  try{
    const same=await Promise.all(Array.from({length:100},()=>read('company-a',load)));
    assert.equal(calls,1);assert(same.every(value=>value.version===1));
    await read('company-a',load);assert.equal(calls,1);
    await read('company-b',load);assert.equal(calls,2,'Company keys must be isolated');
    now+=2001;await read('company-a',load);assert.equal(calls,3);
    await assert.rejects(read('broken',async()=>{throw new Error('expected');}));
    assert.equal((await read('broken',load)).version,4,'Failures must not poison the cache');
    console.log('PASS 100 concurrent identical reads share one loader, bounded TTL/company isolation, eviction and failure retry.');
  }finally{Date.now=realNow;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
