const { Client } = require('pg');
const fs = require('fs');

async function applySql() {
  const connectionString = 'postgresql://postgres:0123853229QWEASDZXC@db.ncuwnuihndfxegpouoeb.supabase.co:5432/postgres';
  const sqlFile = process.argv[2];

  if (!sqlFile) {
    console.error('Please provide an SQL file to apply');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');

  const client = new Client({
    user: 'postgres.ncuwnuihndfxegpouoeb',
    password: '0123853229QWEASDZXC',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database (direct)');

    console.log(`Applying SQL from ${sqlFile}...`);
    await client.query(sql);
    
    console.log('SQL applied successfully!');
  } catch (err) {
    console.error('Error applying SQL:', err);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

applySql();
