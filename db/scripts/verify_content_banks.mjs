import pg from 'pg';
const url = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Local database only.');
const client = new pg.Client({connectionString:url.toString()});
await client.connect();
try {
 if (process.argv.includes('--purge-rejected')) {
   const exists = (await client.query("SELECT to_regclass('public.content_cleanup_archive') AS name")).rows[0].name;
   if (exists) {
     console.table((await client.query('SELECT source_table,reason,count(*)::int AS rejected_entries FROM public.content_cleanup_archive GROUP BY source_table,reason')).rows);
     await client.query('DROP TABLE public.content_cleanup_archive');
     console.log('Permanently removed rejected-content archive.');
   }
 }
 if (process.argv.includes('--repair-generated')) {
   const result = await client.query("UPDATE questions SET content=jsonb_set(content::jsonb,'{text}',to_jsonb(regexp_replace(content->>'text','([.!?]) [a-z]+[.]$','\\1'))) WHERE content->>'sourceKey' LIKE 'typing:%' AND content->>'text' ~ '[.!?] [a-z]+[.]$'");
   console.log(`Repaired ${result.rowCount} generated typing passages without removing session history.`);
 }
 const checks = [
  ['Duplicate words', "SELECT count(*)::int AS failures FROM (SELECT lower(trim(word)) FROM master_word_bank GROUP BY lower(trim(word)) HAVING count(*)>1) d"],
  ['Duplicate typing passages', "SELECT count(*)::int AS failures FROM (SELECT lower(trim(prompt_text)) FROM master_typing_bank GROUP BY lower(trim(prompt_text)) HAVING count(*)>1) d"],
  ['Artificial typing suffixes', "SELECT count(*)::int AS failures FROM master_typing_bank WHERE prompt_text ~ '[.!?] [a-z]+[.]$'"],
  ['Artificial generated typing suffixes', "SELECT count(*)::int AS failures FROM questions WHERE content->>'sourceKey' LIKE 'typing:%' AND content->>'text' ~ '[.!?] [a-z]+[.]$'"],
  ['Invalid trivia choices', "SELECT count(*)::int AS failures FROM master_trivia_bank t WHERE trim(question)='' OR trim(answer)='' OR jsonb_typeof(to_jsonb(decoys)) <> 'array' OR jsonb_array_length(to_jsonb(decoys))<>3 OR (SELECT count(DISTINCT lower(trim(value))) FROM jsonb_array_elements_text(to_jsonb(decoys)||jsonb_build_array(answer)))<>4"],
  ['Invalid odd-object pairs', "SELECT count(*)::int AS failures FROM master_odd_object_bank WHERE jsonb_typeof(items::jsonb)<>'array' OR jsonb_array_length(items::jsonb)<>2 OR items::jsonb->>0=items::jsonb->>1"],
 ];
 const results = [];
 for (const [check,sql] of checks) results.push({check,...(await client.query(sql)).rows[0]});
 console.table(results);
 console.table((await client.query("SELECT 'word' bank,difficulty,count(*)::int FROM master_word_bank GROUP BY difficulty UNION ALL SELECT 'typing',difficulty,count(*)::int FROM master_typing_bank GROUP BY difficulty UNION ALL SELECT 'odd',difficulty,count(*)::int FROM master_odd_object_bank GROUP BY difficulty UNION ALL SELECT 'trivia',difficulty,count(*)::int FROM master_trivia_bank GROUP BY difficulty ORDER BY bank,difficulty")).rows);
 const sources = await client.query("SELECT content FROM questions WHERE content::text ILIKE '%sourceKey%' LIMIT 3");
 console.log('Generated source identities:', JSON.stringify(sources.rows));
 if (results.some((result) => result.failures > 0)) process.exitCode = 1;
} finally { await client.end(); }
