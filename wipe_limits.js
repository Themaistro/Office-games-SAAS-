const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function wipeLimits() {
  const { error } = await supabase.from('profiles').update({
    session_time_limit_minutes: null,
    daily_time_limit_minutes: null
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wipe complete, error:', error);
}
wipeLimits();
