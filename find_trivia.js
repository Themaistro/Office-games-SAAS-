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
  const { data } = await supabase.from('master_trivia_bank').select('question, department, difficulty').ilike('question', '%Landing Page%').limit(5);
  console.log("Landing page:", data);
  const { data: d2 } = await supabase.from('master_trivia_bank').select('question, department, difficulty').ilike('question', '%Katamari Damacy%').limit(5);
  console.log("Katamari:", d2);
  const { data: d3 } = await supabase.from('master_trivia_bank').select('question, department, difficulty').ilike('question', '%Six Sigma%').limit(5);
  console.log("Six Sigma:", d3);
  const { data: d4 } = await supabase.from('master_trivia_bank').select('question, department, difficulty').ilike('question', '%DNS%').limit(5);
  console.log("DNS:", d4);
}

check();
