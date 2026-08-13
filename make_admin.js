const { Client } = require('pg');

async function makeAdmin() {
  const connectionString = 'postgresql://postgres:0123853229QWEASDZXC@db.ncuwnuihndfxegpouoeb.supabase.co:5432/postgres';

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const res = await client.query("UPDATE public.profiles SET role = 'admin';");
    console.log(`Updated ${res.rowCount} users to admin role.`);

  } catch (err) {
    console.error('Error updating profiles:', err);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

makeAdmin();
