import pg from 'pg';
const url=new URL(process.env.DATABASE_URL);if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local database only.');
const rules=[
 {match:/^how many (?:letters|letters are).*English alphabet/i,question:'How many letters are in the English alphabet?',answer:'26',decoys:['24','28','30'],source:'https://assets.cambridge.org/97805216/48660/frontmatter/9780521648660_frontmatter.pdf'},
 {match:/^how many planets.*(?:Solar System|solar system)/i,question:'How many planets are in our Solar System?',answer:'8',decoys:['7','9','10'],source:'https://science.nasa.gov/solar-system/planets/'},
 {match:/^(?:approximately|about).*percentage.*Earth.*surface.*water|^71% of the Earth/i,question:"Approximately what percentage of Earth's surface is covered by water?",answer:'71%',decoys:['29%','50%','95%'],source:'https://www.noaa.gov/jetstream/ocean'},
 {match:/^how many cards.*standard deck/i,question:'How many cards are in a standard deck, excluding jokers?',answer:'52',decoys:['40','48','54'],source:'https://bicyclecards.com/how-to-play/bingo'},
 {match:/^how many players.*(?:football|soccer).*team/i,question:'In association football, what is the maximum number of players one team may have on the field?',answer:'11',decoys:['9','10','12'],source:'https://theifab.com/laws/latest/the-players/'},
 {match:/^five dollars is worth how many nickels/i,question:'How many US five-cent coins make five US dollars?',answer:'100',decoys:['20','50','200'],source:'https://www.usmint.gov/learn/coins-and-medals/circulating-coins'}
];
const client=new pg.Client({connectionString:url.toString()});await client.connect();
try{
 await client.query('BEGIN');let removed=0,reviewed=0;
 const rows=(await client.query('SELECT id,question FROM master_trivia_bank ORDER BY id')).rows;
 for(const rule of rules){const matches=rows.filter(row=>rule.match.test(row.question));if(!matches.length)continue;const keep=matches[0];
  await client.query('UPDATE master_trivia_bank SET question=$2,answer=$3,decoys=$4::jsonb WHERE id=$1',[keep.id,rule.question,rule.answer,JSON.stringify(rule.decoys)]);
  await client.query('INSERT INTO trivia_review_sources(question_id,source_url) VALUES($1,$2) ON CONFLICT(question_id) DO UPDATE SET source_url=EXCLUDED.source_url,reviewed_at=now()',[keep.id,rule.source]);reviewed++;
  for(const row of matches){await client.query("UPDATE questions SET is_active=false WHERE content->>'sourceKey'=$1",[`trivia:${row.id}`]);if(row.id!==keep.id){await client.query("UPDATE question_history SET content_key=$2 WHERE content_key=$1",[`trivia:${row.id}`,`trivia:${keep.id}`]);await client.query('DELETE FROM master_trivia_bank WHERE id=$1',[row.id]);removed++;}}
 }
 await client.query('COMMIT');console.log(`Source-checked ${reviewed} fact groups; removed ${removed} reworded duplicates. Historical question records retained; obsolete generated copies excluded from new missions.`);
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
