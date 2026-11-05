const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../src/features/missions/domain/rotation.ts'),'utf8');
const context={exports:{}};new Function('exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(context.exports);
const slugs=['memory','sequence','card_match','reaction','stroop','trivia','coding','typing','word','unscramble','logic','sudoku_lite','odd_object','math','mental_math'];
const games=slugs.map((slug,index)=>({id:`game-${index}`,slug,name:slug}));
const report=[];
for(const count of [1,5,15])for(const user of ['player-a','player-b']) {
 const history=[],usage=new Map(games.map(game=>[game.id,0]));let repeatedOrders=0;
 for(let day=0;day<365;day++) {
  const date=new Date(Date.UTC(2027,0,day+1)).toISOString().slice(0,10)+':'+user;
  const route=context.exports.buildDailyLineup(date,games,count,history.slice(0,60)).games.map(game=>game.id);
  assert.equal(route.length,count);assert.equal(new Set(route).size,count);
  const repeated=context.exports.buildDailyLineup(date,games,count,history.slice(0,60)).games.map(game=>game.id);
  assert.equal(route.join(','),repeated.join(','));
  if(route.join(',')===history[0]?.join(','))repeatedOrders++;
  route.forEach(id=>usage.set(id,usage.get(id)+1));history.unshift(route);
 }
 report.push({count,user,minUses:Math.min(...usage.values()),maxUses:Math.max(...usage.values()),consecutiveIdenticalOrders:repeatedOrders});
}
console.table(report);console.log('Verified 2,190 user-days: exact counts, distinct games and deterministic route generation. This measures scheduling, not equal difficulty or scoring.');
