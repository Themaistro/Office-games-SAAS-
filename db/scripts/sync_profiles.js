const { Client } = require('pg');

async function syncProfiles() {
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

    await client.query(`
      INSERT INTO public.profiles (id, email)
      SELECT id, email FROM auth.users
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Synced all existing users into public.profiles!');

  } catch (err) {
    console.error('Error during profile sync:', err);
  } finally {
    await client.end();
  }
}

syncProfiles();
