const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length > 0) acc[k.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('run_sql', { query: "SELECT * FROM pg_policies WHERE tablename = 'game_types'" });
  console.log("data:", data, "error:", error);
}

check();
