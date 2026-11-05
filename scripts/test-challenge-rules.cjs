const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {validateChallenge}=require('../src/features/challenges/domain/challenge-validation.ts');
const {generateSudoku}=require('../src/features/challenges/domain/sudoku.ts');
const {seededNumber,seededShuffle}=require('../src/features/challenges/domain/challenge-seed.ts');
const q=(slug,content={},difficulty='easy',correctAnswer='42')=>({id:'rule-fixture',slug,content,difficulty,correctAnswer});
assert.equal(validateChallenge(q('logic'),'wrong',1).correct,false);
assert.equal(validateChallenge(q('logic'),'42',1).correct,true);
assert.equal(validateChallenge(q('reaction'),'true',0).correct,false);
assert.equal(validateChallenge(q('reaction'),'230ms',0.23).correct,true);
assert.equal(validateChallenge(q('reaction'),'1ms',0.001).correct,false);
assert.equal(validateChallenge(q('reaction',{},'hard'),'900ms',0.9).correct,false);
assert.equal(validateChallenge(q('typing',{text:'one two three four five'}),'one two three four wrong',10).accuracy,0.8);
assert.equal(validateChallenge(q('typing',{text:'one two three four five'}),'random',10).correct,false);
const cards={cards:[{emoji:'a'},{emoji:'b'},{emoji:'a'},{emoji:'b'}]};
assert.equal(validateChallenge(q('card-match',cards),'completed',10).correct,false);
assert.equal(validateChallenge(q('card-match',cards),JSON.stringify([[0,2],[1,3]]),10).correct,true);
assert.equal(validateChallenge(q('card-match',cards),JSON.stringify([[0,0],[1,3]]),10).correct,false);
assert.equal(validateChallenge(q('card-match',cards),JSON.stringify([[0,2],[0,2],[1,3]]),10).correct,false);
const positions=seededShuffle([...Array(9).keys()],'rule-fixture','sequence-positions').slice(0,4);
assert.equal(validateChallenge(q('sequence'),JSON.stringify(positions),4).correct,true);
assert.equal(validateChallenge(q('sequence'),'Completed Sequence',4).correct,false);
const odd=seededNumber('rule-fixture','odd-position',25);
assert.equal(validateChallenge(q('odd-object'),String(odd),2).correct,true);
assert.equal(validateChallenge(q('odd-object'),'Found It!',2).correct,false);
let checked=0;
for(const difficulty of ['easy','medium','hard'])for(let i=0;i<20;i++){
  const seed=`sudoku-${i}`;
  const first=generateSudoku(difficulty,seed),second=generateSudoku(difficulty,seed);
  assert.deepEqual(first,second);
  const sorted=values=>[...values].sort().join('');
  for(let row=0;row<6;row++){assert.equal(sorted(first.solution[row]),'123456');assert.equal(sorted(first.solution.map(line=>line[row])),'123456');}
  for(let row=0;row<6;row+=2)for(let col=0;col<6;col+=3)assert.equal(sorted([0,1].flatMap(r=>[0,1,2].map(c=>first.solution[row+r][col+c]))),'123456');
  assert.equal(validateChallenge(q('sudoku-lite',{seed},difficulty),JSON.stringify(first.solution),20).correct,true);
  const broken=first.solution.map(row=>[...row]);broken[0][0]=0;
  assert.equal(validateChallenge(q('sudoku-lite',{seed},difficulty),JSON.stringify(broken),20).correct,false);
  checked++;
}
console.log(`PASS answer, interaction, timing and forged-result checks; ${checked} deterministic Sudoku puzzles validated.`);
