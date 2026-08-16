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
  const { count: easy } = await supabase.from('master_trivia_bank').select('*', { count: 'exact', head: true }).eq('difficulty', 'easy');
  const { count: med } = await supabase.from('master_trivia_bank').select('*', { count: 'exact', head: true }).eq('difficulty', 'medium');
  const { count: hard } = await supabase.from('master_trivia_bank').select('*', { count: 'exact', head: true }).eq('difficulty', 'hard');
  console.log(`Trivia counts: Easy=${easy}, Medium=${med}, Hard=${hard}`);
}

check();
