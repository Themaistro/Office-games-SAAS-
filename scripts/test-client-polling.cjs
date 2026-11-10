require('./register-typescript.cjs');
const assert=require('node:assert/strict');
const {createPollingStore}=require('../src/lib/client-polling.ts');
async function main(){
  global.window=new EventTarget();global.document=new EventTarget();document.visibilityState='visible';
  let requests=0,complete;global.fetch=()=>{requests++;return new Promise(resolve=>{complete=resolve;});};
  const store=createPollingStore('/test',60000),listener=()=>{};store.listeners.add(listener);
  try{
    store.start();const first=store.refresh(),second=store.refresh();assert.equal(first,second);assert.equal(requests,1);
    complete(new Response(JSON.stringify({version:1})));await first;assert.equal(store.snapshot.data.version,1);
    const beforeMutation=store.refresh(),afterMutation=store.invalidate();
    complete(new Response(JSON.stringify({version:2})));await beforeMutation;await new Promise(setImmediate);
    assert.equal(store.snapshot.data.version,1,'Pre-mutation reads must not replace the current snapshot');
    complete(new Response(JSON.stringify({version:3})));await afterMutation;assert.equal(store.snapshot.data.version,3);
    const priorRequests=requests;
    document.visibilityState='hidden';await store.refresh();assert.equal(requests,priorRequests);
    document.visibilityState='visible';const stale=store.refresh();store.stop();store.listeners.clear();
    complete(new Response(JSON.stringify({version:2})));await stale;assert.equal(store.snapshot.data,undefined,'Unmounted requests cannot restore sensitive state');
    store.listeners.add(listener);store.start();const next=store.refresh();complete(new Response('{}',{status:500}));await next;assert.equal(store.snapshot.failed,true);
    console.log('PASS shared in-flight coalescing, hidden-tab suspension, unmount invalidation, sensitive-state reset and error recovery.');
  }finally{store.listeners.clear();store.stop();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
