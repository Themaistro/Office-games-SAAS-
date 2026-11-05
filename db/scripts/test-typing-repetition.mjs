import pg from 'pg';
const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local database only.');
const client=new pg.Client({connectionString:url.toString()});await client.connect();
try {
 const rows=(await client.query('SELECT id,prompt_text,difficulty FROM master_typing_bank')).rows;
 const rounds=(await client.query("SELECT easy_rounds,medium_rounds,hard_rounds FROM game_types WHERE slug='typing'")).rows[0];
 const report=[];
 for(const difficulty of ['easy','medium','hard']) {
  const bank=rows.filter(row=>row.difficulty===difficulty);
  if(new Set(bank.map(row=>row.prompt_text.trim().toLowerCase())).size!==bank.length)throw new Error('Duplicate passage in '+difficulty);
  const perVisit=Number(rounds?.[difficulty+'_rounds']??1);
  report.push({difficulty,passages:bank.length,roundsPerAppearance:perVisit,completeAppearancesBeforeExhaustion:perVisit?Math.floor(bank.length/perVisit):'disabled'});
 }
 console.table(report);
 console.log('Capacity is measured in typing-game appearances, not calendar days. More rounds consume passages faster. It assumes fresh-content selection from the complete difficulty tier.');
 console.log('Individually source-reviewed trivia:',(await client.query('SELECT count(*)::int AS count FROM trivia_review_sources')).rows[0].count);
} finally {await client.end();}
