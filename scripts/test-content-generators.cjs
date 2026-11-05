const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname,'../src/features/content/domain/game-content.ts'),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context = {exports:{},Math,Set,Array,console};
vm.runInNewContext(compiled,context);
const g = context.exports;
let checks = 0;
for (const difficulty of ['easy','medium','hard']) {
 for (const puzzle of g.generateCardMatch(200,difficulty)) {
   const counts = new Map(); for (const card of puzzle.content.cards) counts.set(card.emoji,(counts.get(card.emoji)||0)+1);
   assert([...counts.values()].every((count)=>count===2)); checks++;
 }
 for (const puzzle of g.generateSudokuLite(200,difficulty)) {
   const grid = puzzle.content.grid;
   assert.equal(grid.filter((value)=>value===null).length,1);
   const filled = grid.map((value)=>value===null ? Number(puzzle.correctAnswer) : value);
   assert.equal(new Set(filled).size,9);
   assert(puzzle.options.includes(puzzle.correctAnswer)); checks++;
 }
 for (const puzzle of g.generateMemory(200,difficulty)) {
   assert.equal(puzzle.correctAnswer.length,{easy:5,medium:7,hard:9}[difficulty]); checks++;
 }
 for (const puzzle of g.generateSequence(200,difficulty)) {
   assert(puzzle.correctAnswer); assert(puzzle.options.includes(puzzle.correctAnswer));
   assert.equal(new Set(puzzle.options).size,puzzle.options.length); checks++;
 }
}
const anagrams = [{id:'a',word:'listen',difficulty:'easy'},{id:'b',word:'silent',difficulty:'easy'},{id:'c',word:'garden',difficulty:'easy'},{id:'d',word:'planet',difficulty:'easy'},{id:'e',word:'window',difficulty:'easy'}];
for (const puzzle of g.generateWordUnscramble(anagrams,5,'easy')) {
 const signature=(word)=>word.toLowerCase().split('').sort().join('');
 assert.equal(puzzle.options.filter((word)=>signature(word)===signature(puzzle.correctAnswer)).length,1); checks++;
}
console.log(`Passed ${checks} generator integrity checks. Sudoku check covers the current missing-number generator, not the interactive board solver.`);
const loadLocal=(name,dependencies={})=>{const target={exports:{},Math,Set,Array,require:(dependency)=>{assert(dependencies[dependency],`Unexpected dependency ${dependency}`);return dependencies[dependency];}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/features/challenges/domain',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,target);return target.exports;};
const seeds=loadLocal('challenge-seed');
const sudoku=loadLocal('sudoku',{'./challenge-seed':seeds});
function solutionCount(board) {
 let total=0;
 function solve(){if(total>1)return;let cell=null,choices=[];
  for(let row=0;row<6;row++)for(let col=0;col<6;col++)if(board[row][col]===null){
   const options=[];for(let n=1;n<=6;n++){let valid=true;for(let k=0;k<6;k++)if(board[row][k]===n||board[k][col]===n)valid=false;for(let r=Math.floor(row/2)*2;r<Math.floor(row/2)*2+2;r++)for(let c=Math.floor(col/3)*3;c<Math.floor(col/3)*3+3;c++)if(board[r][c]===n)valid=false;if(valid)options.push(n);}
   if(!options.length)return;if(!cell||options.length<choices.length){cell=[row,col];choices=options;}
  }
  if(!cell){total++;return;}for(const n of choices){board[cell[0]][cell[1]]=n;solve();board[cell[0]][cell[1]]=null;}
 }solve();return total;
}
for(const difficulty of ['easy','medium','hard'])for(let index=0;index<60;index++){
 const {puzzle,solution}=sudoku.generateSudoku(difficulty,`audit:${difficulty}:${index}`);
 for(let row=0;row<6;row++){assert.equal(new Set(solution[row]).size,6);assert.equal(new Set(solution.map(line=>line[row])).size,6);for(let col=0;col<6;col++)if(puzzle[row][col]!==null)assert.equal(puzzle[row][col],solution[row][col]);}
 for(let row=0;row<6;row+=2)for(let col=0;col<6;col+=3){const values=[];for(let r=row;r<row+2;r++)for(let c=col;c<col+3;c++)values.push(solution[r][c]);assert.equal(new Set(values).size,6);}
 assert.equal(solutionCount(puzzle.map(row=>Array.from(row))),1);
}
console.log('Passed 180 interactive Sudoku boards: row/column/box validity, preserved clues and exactly one solution using an independent solver.');
