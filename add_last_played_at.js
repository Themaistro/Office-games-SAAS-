const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // If we don't have exec_sql RPC, we'll tell the user to run it.
  const { error } = await supabase.rpc('exec_sql', { sql_query: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_played_at timestamp with time zone;" });
  if (error) {
    console.log("Could not run via RPC:", error.message);
  } else {
    console.log("Column added successfully via RPC.");
  }
}
run();
