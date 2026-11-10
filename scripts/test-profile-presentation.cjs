require('./register-typescript.cjs');
const assert=require('node:assert/strict');
const {createProfileRanking}=require('../src/features/players/application/profile-ranking.ts');
const {getMaterialAdvantage}=require('../src/features/lounge/domain/chess-presentation.ts');
const {profileProgress,challengeRadar}=require('../src/features/players/domain/profile-summary.ts');
async function main(){
 let calls=0;
 const rank=createProfileRanking({countHigherXp:async()=>{calls++;return {count:3};},countEqualXpBeforeName:async()=>({count:2}),countDepartmentHigherXp:async()=>({count:1}),countDepartmentEqualXpBeforeName:async()=>({count:1})});
 const base={role:'employee',total_xp:100,full_name:'Test',department:'IT'};
 assert.deepEqual(await rank(base),{userRank:'6',deptRank:'3'});
 assert.deepEqual(await rank({...base,full_name:null,department:null}),{userRank:'4',deptRank:'--'});
 const before=calls;assert.deepEqual(await rank({...base,role:'admin'}),{userRank:'Admin',deptRank:'--'});assert.equal(calls,before);
 assert.deepEqual(getMaterialAdvantage('8/8/8/8/8/8/8/K6k w - - 0 1'),{white:0,black:0});
 assert.deepEqual(getMaterialAdvantage('8/8/8/8/8/8/8/KQ5k w - - 0 1'),{white:9,black:0});
 assert.deepEqual(getMaterialAdvantage('8/8/8/8/8/8/8/Kr5k w - - 0 1'),{white:0,black:5});
 assert.equal(profileProgress(1,600).progressPercent,50);assert.equal(profileProgress(10,12000).userTitle,'Mastermind');
 assert(challengeRadar([]).every(point=>point.A===0),'No attempts must not invent strengths');
 const radar=challengeRadar([{name:'Memory',slug:'memory',plays:2,avgScore:50,accuracy:100},{name:'Card Match',slug:'card-match',plays:2,avgScore:0,accuracy:0}]);
 assert.equal(radar.find(point=>point.subject==='Memory').A,50);
 console.log('PASS profile ranking ties/missing departments/admin handling and chess material display.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
