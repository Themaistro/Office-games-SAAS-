import pg from 'pg';
const url = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Local database only.');
const client = new pg.Client({connectionString:url.toString()});
const normalize = (value) => String(value ?? '').trim().replace(/\s+/g,' ').toLowerCase();
const counts = {};
await client.connect();
try {
 await client.query('BEGIN');
 const archive = async (table,row,reason) => {
   const prefix = { master_typing_bank: 'typing', master_word_bank: 'word', master_odd_object_bank: 'odd', master_trivia_bank: 'trivia' }[table];
   await client.query("UPDATE questions SET is_active=false WHERE content->>'sourceKey'=$1",[`${prefix}:${row.id}`]);
   await client.query(`DELETE FROM ${table} WHERE id=$1`,[row.id]);
   counts[`${table}: ${reason}`] = (counts[`${table}: ${reason}`] ?? 0) + 1;
 };
 for (const table of ['master_typing_bank','master_word_bank','master_odd_object_bank','master_trivia_bank']) {
   const rows = (await client.query(`SELECT * FROM ${table} ORDER BY created_at,id`)).rows;
   const seen = new Set();
   for (const row of rows) {
     let key, reason;
     if (table === 'master_typing_bank') {
       key = normalize(row.prompt_text);
       if (!key || /[.!?]\s+[a-z]+\.$/.test(row.prompt_text)) reason = 'artificial trailing word or empty passage';
       // Preserve reviewed difficulty labels; length alone is not difficulty.
     } else if (table === 'master_word_bank') {
       key = normalize(row.word);
       if (!/^[a-z]{3,20}$/.test(key)) reason = 'invalid word format';
       if (!reason) await client.query('UPDATE master_word_bank SET difficulty=$2 WHERE id=$1',[row.id,key.length <= 5 ? 'easy' : key.length <= 8 ? 'medium' : 'hard']);
     } else if (table === 'master_odd_object_bank') {
       const items = Array.isArray(row.items) ? [...new Set(row.items.map(normalize))].filter(Boolean) : [];
       key = [...items].sort().join('|');
       if (items.length !== 2) reason = 'ambiguous visual pair';
       else await client.query('UPDATE master_odd_object_bank SET items=$2::jsonb WHERE id=$1',[row.id,JSON.stringify(items)]);
     } else {
       key = normalize(row.question);
       const options = [row.answer,...(Array.isArray(row.decoys) ? row.decoys : [])].map(normalize);
       if (!key || options.length !== 4 || options.some((option) => !option) || new Set(options).size !== 4) reason = 'invalid or duplicated answer choices';
       else if (/\b(policy|scenario|strategy|question|example)\s*#?\s*\d+\b/i.test(row.question) || ['compliance','increase revenue'].includes(normalize(row.answer))) reason = 'placeholder business content';
       else if (['IT','Engineering','Product'].includes(row.department) && !/^Follow these instructions:/i.test(row.question) && !/\b(keyboard|clipboard|Prt Sc|USB|CPU|Windows|browser|password|email|recycle bin|copy and paste)\b/i.test(row.question)) reason = 'specialist computing knowledge';
       else if (/\b(nephelococcygia|stimpmeter|OSPF|DeMorgan|Sanskrit hymns|motorized window washers|Fair Works Australia|stadium of light|top.level domain)\b/i.test(row.question)) reason = 'specialist or ambiguous general trivia';
       else if (/\b(wrestl|WWF|WWE|World Trade Center|anime|manga|Pok[eé]mon|Dragon Ball|Naruto|Final Fantasy|Warcraft|Dota|League of Legends|Counter.Strike|StarCraft|professional wrestling)\b/i.test(row.question)) reason = 'specialist entertainment knowledge';
     }
     if (!reason && seen.has(key)) reason = 'duplicate content';
     if (reason) await archive(table,row,reason);
     else seen.add(key);
   }
 }
 await client.query('COMMIT');
 console.table(counts);
 console.table((await client.query("SELECT 'word' bank,difficulty,count(*)::int FROM master_word_bank GROUP BY difficulty UNION ALL SELECT 'typing',difficulty,count(*)::int FROM master_typing_bank GROUP BY difficulty UNION ALL SELECT 'odd',difficulty,count(*)::int FROM master_odd_object_bank GROUP BY difficulty UNION ALL SELECT 'trivia',difficulty,count(*)::int FROM master_trivia_bank GROUP BY difficulty ORDER BY bank,difficulty")).rows);
} catch(error) { await client.query('ROLLBACK'); throw error; } finally { await client.end(); }
