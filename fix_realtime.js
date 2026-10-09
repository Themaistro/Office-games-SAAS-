const { Client } = require('pg');

async function fixRealtime() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ncuwnuihndfxegpouoeb',
    password: '0123853229QWEASDZXC',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase Postgres!');

    // Get current publication tables
    const res = await client.query(`
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime';
    `);
    
    console.log('Currently in realtime:', res.rows.map(r => r.tablename));

    const tablesToAdd = [
      'chess_games', 
      'ttt_games', 
      'profiles', 
      'daily_sessions', 
      'announcements', 
      'system_settings',
      'game_challenges',
      'activity_feed'
    ];

    for (const table of tablesToAdd) {
      console.log(`Adding ${table} to supabase_realtime...`);
      try {
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`);
      } catch (err) {
        if (err.message.includes('already in publication')) {
          console.log(`  -> ${table} is already in the publication.`);
        } else {
          console.error(`  -> Failed for ${table}:`, err.message);
        }
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}

fixRealtime();
