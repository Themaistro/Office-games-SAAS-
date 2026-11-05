import pg from 'pg';
const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local database only.');
const client=new pg.Client({connectionString:url.toString()});
await client.connect();
try {
 const email=process.argv[2]??null;
 const {rows}=await client.query(`SELECT g.name AS game,q.difficulty,
 count(DISTINCT ds.user_id)::int AS players,
 count(*) FILTER(WHERE sq.outcome IN ('correct','incorrect','timed_out'))::int AS attempted,
 count(*) FILTER(WHERE sq.outcome='correct')::int AS correct,
 count(*) FILTER(WHERE sq.outcome='timed_out')::int AS timed_out,
 count(*) FILTER(WHERE sq.outcome='skipped')::int AS skipped,
 count(*) FILTER(WHERE sq.outcome IS NULL)::int AS unknown,
 round(avg(sq.time_spent_seconds) FILTER(WHERE sq.outcome IN ('correct','incorrect','timed_out'))::numeric,1) AS average_seconds,
 round(avg(CASE WHEN sq.outcome='correct' THEN 100.0 ELSE 0.0 END) FILTER(WHERE sq.outcome IN ('correct','incorrect','timed_out')),1) AS success_percent,
 round(avg(sq.earned_xp) FILTER(WHERE sq.outcome IN ('correct','incorrect','timed_out'))::numeric,1) AS average_xp
 FROM session_questions sq JOIN daily_sessions ds ON ds.id=sq.session_id
 JOIN profiles p ON p.id=ds.user_id JOIN questions q ON q.id=sq.question_id JOIN game_types g ON g.id=q.game_type_id
 WHERE ($1::text IS NULL OR lower(p.email)=lower($1)) AND sq.is_completed=true
 AND q.content->>'qaFixture' IS DISTINCT FROM 'true'
 AND p.position IS DISTINCT FROM 'Local QA'
 GROUP BY g.name,q.difficulty ORDER BY g.name,q.difficulty`,[email]);
 console.table(rows.map(row=>({...row,evidence:row.attempted<5?'Not enough recorded attempts':row.players===1?'Solo pilot only':'Multiple accounts; human participation unverified'})));
 const known=rows.reduce((total,row)=>total+row.attempted,0);
 console.log(`Usable attempts: ${known}. Skips and missing outcomes are excluded from success rates. Test accounts are not assumed to be separate human participants.`);
 if(!known)console.log('Play fresh missions before judging difficulty. No difficulty changes are justified by the current legacy records.');
}finally{await client.end();}
