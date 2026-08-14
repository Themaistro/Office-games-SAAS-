const { Client } = require('pg');

async function fixDatabase() {
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

    await client.query('DELETE FROM public.daily_sessions;');
    console.log('Cleared out broken daily sessions.');

    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reloaded!');

  } catch (err) {
    console.error('Error during database fix:', err);
  } finally {
    await client.end();
  }
}

fixDatabase();
