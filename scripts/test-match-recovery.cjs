require('./register-typescript.cjs');
const assert=require('node:assert/strict');
const {createSnapshotSync}=require('../src/features/lounge/application/snapshot-sync.ts');
const {assertMatchSnapshot,isOlderSnapshot}=require('../src/features/lounge/domain/match-snapshot.ts');
const {parseMatchEvent}=require('../src/features/lounge/domain/realtime-event.ts');
const {remainingClock,elapsedMilliseconds}=require('../src/features/lounge/domain/match-clock.ts');
const {acceptedSentInvitation}=require('../src/features/lounge/domain/accepted-invitation.ts');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function main(){
 for(const type of ['chess','ttt','connect-four'])assert.equal(acceptedSentInvitation([{id:'rematch',type,status:'in_progress'}],new Set(['rematch'])).path,`/dashboard/${type}/rematch`);
 assert.equal(acceptedSentInvitation([{id:'old',type:'chess',status:'in_progress'}],new Set(['new'])),null);
 assert.equal(acceptedSentInvitation([{id:'new',type:'chess',status:'waiting'}],new Set(['new'])),null);
 let calls=0,applied=[],failed=0;const first=deferred();
 const sync=createSnapshotSync({read:()=>++calls===1?first.promise:Promise.resolve(2),apply:value=>applied.push(value),failed:()=>failed++});
 const pending=sync.refresh();const queued=sync.refresh();sync.refresh();assert.equal(calls,1);first.resolve(1);await pending;await queued;
 assert.equal(calls,2);assert.deepEqual(applied,[1,2]);assert.equal(failed,0);
 const old=deferred();let signal;
 const mutation=createSnapshotSync({read:s=>{signal=s;return old.promise;},apply:()=>assert.fail('Stale read replaced a mutation'),failed:()=>assert.fail('Abort reported as outage')});
 const stale=mutation.refresh();mutation.pause();assert(signal.aborted);old.resolve(1);await stale;mutation.dispose();
 const held=deferred();let reads=0;const restored=[];const resume=createSnapshotSync({read:()=>++reads===1?held.promise:Promise.resolve(9),apply:value=>restored.push(value),failed:()=>assert.fail('Unexpected retry failure')});
 const request=resume.refresh();resume.pause();resume.resume();const recovered=resume.refresh();held.resolve(4);await request;await recovered;assert.deepEqual(restored,[9]);resume.dispose();
 const abandoned=deferred();const dead=createSnapshotSync({read:()=>abandoned.promise,apply:()=>assert.fail('Unmounted result applied'),failed:()=>assert.fail('Unmounted error surfaced')});const waiting=dead.refresh();dead.dispose();abandoned.reject(new Error('gone'));await waiting;
 let attempt=0;const retry=createSnapshotSync({read:async()=>{if(!attempt++)throw new Error('offline');return 3;},apply:v=>applied.push(v),failed:()=>failed++});await retry.refresh();await retry.refresh();assert.equal(failed,1);assert.equal(applied.at(-1),3);
 const board={id:'match',status:'in_progress',board_state:'---------',current_turn:'X',updated_at:'2026-11-05T00:00:00Z'};
 assertMatchSnapshot(board,'ttt','match');for(const bad of [{...board,id:'other'},{...board,board_state:'bad'},{...board,current_turn:'R'},{...board,status:'unknown'}])assert.throws(()=>assertMatchSnapshot(bad,'ttt','match'));
 assert(isOlderSnapshot(board,{...board,updated_at:'2026-11-05T00:00:01Z'}));
 assert.equal(parseMatchEvent({type:'move',payload:{white_time_ms:-1}}),null);assert.equal(parseMatchEvent({type:'chat',payload:{text:42}}),null);assert.equal(parseMatchEvent({type:'chat',payload:{text:'hi'}}).type,'chat');
 assert.equal(parseMatchEvent({type:'move',payload:{white_time_ms:'60000'}}).payload.white_time_ms,60000);assert.equal(remainingClock('0',false,null,'draw'),0);
 assert.equal(remainingClock(0,false,null,'draw'),0);assert.equal(remainingClock(10000,true,'2026-11-05T00:00:00Z','in_progress',Date.parse('2026-11-05T00:00:05Z')),5000);assert.equal(remainingClock(10000,false,'2026-11-05T00:00:00Z','in_progress',Date.parse('2026-11-05T00:00:05Z')),10000);assert.equal(elapsedMilliseconds(100,5100),5000);
 sync.dispose();retry.dispose();console.log('PASS coalesced reads, mutation invalidation, unmount cancellation, reconnect retry, snapshot/event contracts and elapsed clocks.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
