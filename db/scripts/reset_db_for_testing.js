const { Client } = require('pg');

async function resetStats() {
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

    console.log('Resetting Daily Sessions and Session Questions...');
    await client.query('DELETE FROM public.session_questions;');
    await client.query('DELETE FROM public.daily_sessions;');

    console.log('Resetting Leaderboard / Profiles XP to 0...');
    await client.query(`
      UPDATE public.profiles 
      SET total_xp = 0, current_level = 1, current_streak = 0;
    `);

    // Reload the postgrest schema cache just in case
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Database successfully reset for clean testing!');
  } catch (err) {
    console.error('Error during database reset:', err);
  } finally {
    await client.end();
  }
}

resetStats();
