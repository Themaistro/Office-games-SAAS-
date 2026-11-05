import pg from 'pg';
const url = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Local database only.');
const client = new pg.Client({connectionString:url.toString()});
const corrections = [
 {old:'Folic acid is the synthetic form of which vitamin?',question:'Folic acid is a form of which B vitamin?',answer:'Vitamin B9',decoys:['Vitamin B1','Vitamin B6','Vitamin B12'],source:'https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/'},
 {old:'At what temperature does water boil?',question:'At standard atmospheric pressure, approximately what temperature does pure water boil at?',answer:'100°C (212°F)',decoys:['0°C (32°F)','50°C (122°F)','200°C (392°F)'],source:'https://www.iapws.org/faq1/boil.html'},
 {old:'How many chromosomes are in your body cells?',question:'How many chromosomes are normally present in a human body cell with a nucleus?',answer:'46',decoys:['23','24','48'],source:'https://www.genome.gov/genetics-glossary/Diploid'},
 {old:"A comet's gaseous envelope (which creates the tail) is called what?",question:'What is the cloud of gas and dust surrounding the nucleus of a comet called?',answer:'The coma',decoys:['The core','The crust','The orbit'],source:'https://science.nasa.gov/solar-system/comets/facts/'},
 {old:"About what percentage of the Earth's surface is water?",question:"Approximately what percentage of Earth's surface is covered by water?",answer:'71%',decoys:['29%','50%','95%'],source:'https://www.noaa.gov/jetstream/ocean'}
];
await client.connect();
try {
 await client.query('BEGIN');
 await client.query('CREATE TABLE IF NOT EXISTS trivia_review_sources(question_id uuid PRIMARY KEY REFERENCES master_trivia_bank(id) ON DELETE CASCADE,source_url text NOT NULL,reviewed_at timestamptz NOT NULL DEFAULT now())');
 for (const item of corrections) {
   const {rows} = await client.query('UPDATE master_trivia_bank SET question=$2,answer=$3,decoys=$4::jsonb WHERE question=$1 OR question=$2 RETURNING id',[item.old,item.question,item.answer,JSON.stringify(item.decoys)]);
   for (const row of rows) await client.query('INSERT INTO trivia_review_sources(question_id,source_url) VALUES($1,$2) ON CONFLICT(question_id) DO UPDATE SET source_url=EXCLUDED.source_url,reviewed_at=now()',[row.id,item.source]);
   for (const row of rows) await client.query("UPDATE questions SET is_active=false WHERE content->>'sourceKey'=$1 AND (correct_answer<>$2 OR content->>'question'<>$3)",[`trivia:${row.id}`,item.answer,item.question]);
 }
 await client.query('COMMIT');
 console.log('Applied source-backed corrections to comet terminology and water-coverage wording.');
} catch(error) { await client.query('ROLLBACK'); throw error; } finally { await client.end(); }
