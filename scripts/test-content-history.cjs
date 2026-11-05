const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const api={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/features/content/domain/content-selection.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(api);
for(const rounds of [1,3,10])for(const difficulty of ['easy','medium','hard']) {
 const seenIds=new Set(),seenKeys=new Set();
 for(let day=0;day<Math.floor(90/rounds);day++){
  const candidates=Array.from({length:90},(_,index)=>({id:`day-${day}-row-${index}`,difficulty,content:{text:`Passage number ${index}`,sourceKey:`typing:passage-${index}`}}));
  candidates.push({...candidates[0],id:`duplicate-${day}`});
  const selected=api.freshCandidatesFirst(candidates,seenIds,seenKeys).slice(0,rounds);
  assert.equal(selected.length,rounds);assert.equal(new Set(selected.map(q=>q.content.sourceKey)).size,rounds);
  for(const question of selected){assert(!seenKeys.has(question.content.sourceKey),'Repeated a passage before bank exhaustion');seenKeys.add(question.content.sourceKey);seenIds.add(question.id);}
 }
}
const candidates=[{id:'old',difficulty:'easy',content:{sourceKey:'seen'}},{id:'new',difficulty:'easy',content:{sourceKey:'fresh'}}];
assert.equal(api.freshCandidatesFirst(candidates,new Set(),new Set(['seen']))[0].id,'new');
console.log('Passed real selector simulations: regenerated daily IDs, duplicate rows, source history, fresh-first fallback, and 1/3/10 rounds per tier.');
