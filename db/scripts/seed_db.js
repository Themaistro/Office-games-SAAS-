const { Client } = require('pg');
const fs = require('fs');

async function seedDatabase() {
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
    console.log('Connected to Supabase Database!');

    console.log('Reading wave1_seed.sql...');
    const seedSql = fs.readFileSync('wave1_seed.sql', 'utf8');
    
    console.log('Executing wave1_seed.sql...');
    await client.query(seedSql);
    console.log('Wave 1 games inserted successfully!');

    // Clear sessions so the user can test the new games today
    await client.query('DELETE FROM public.daily_sessions;');
    console.log('Cleared out daily sessions for fresh testing.');

    // Reload the postgrest schema cache just in case
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reloaded!');

  } catch (err) {
    console.error('Error during database seed:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

seedDatabase();
