require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log("Connected to DB.");
    
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT FALSE;
    `);
    
    console.log("Added has_completed_tutorial column.");
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}
main();
