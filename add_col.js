const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function addCol() {
  // Using rpc or direct sql is not possible with default supabase client, we can use pg or we can just try to run a raw query if we have an RPC setup.
  // Wait, I can just use a supabase migration or I can run it via the local psql if there's a connection string, but I have the postgres connection string in the env? Let's check .env.local
  console.log(Object.keys(env));
}
addCol();
