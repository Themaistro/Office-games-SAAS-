require('./register-typescript.cjs');
const assert=require('node:assert/strict');
const {parseQuestionContent,parseAnswerOptions}=require('../src/features/challenges/domain/question-content.ts');
for(const bad of [null,[],42,{text:3},{seed:[]},{target:NaN},{cards:['a']},{cards:[{id:1,emoji:false}]}])assert.throws(()=>parseQuestionContent(bad));
for(const content of [{text:'Remember me'},{seed:'saved-seed'},{target:12},{cards:[{id:1,emoji:'A'}]},{question:'Which?',isCompanyTrivia:true}])assert.deepEqual(parseQuestionContent(content),content);
for(const bad of [null,{},['A',3]])assert.throws(()=>parseAnswerOptions(bad));
assert.deepEqual(parseAnswerOptions(['A','B']),['A','B']);
console.log('PASS malformed question payloads/options rejected and valid interaction/choice content preserved.');
