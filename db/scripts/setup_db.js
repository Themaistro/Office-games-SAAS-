const { Client } = require('pg');
const fs = require('fs');

async function setupDatabase() {
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

    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync('schema.sql', 'utf8');
    
    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    console.log('Schema created successfully!');

    console.log('Reading seed_data.sql...');
    const seedSql = fs.readFileSync('seed_data.sql', 'utf8');
    
    console.log('Executing seed_data.sql...');
    await client.query(seedSql);
    console.log('Seed data inserted successfully!');

    // Reload the postgrest schema cache just in case
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reloaded!');

  } catch (err) {
    console.error('Error during database setup:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

setupDatabase();
