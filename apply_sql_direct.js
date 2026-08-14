const { Client } = require('pg');
const fs = require('fs');

async function applySql() {
  const connectionString = 'postgresql://postgres:0123853229QWEASDZXC@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?options=project%3Dncuwnuihndfxegpouoeb';
  const sqlFile = process.argv[2];

  if (!sqlFile) {
    console.error('Please provide an SQL file to apply');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');

  const client = new Client({
    connectionString: connectionString,
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
