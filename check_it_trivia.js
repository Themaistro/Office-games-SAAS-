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
  const { data: itHard } = await supabase.from('master_trivia_bank').select('question').eq('department', 'IT').eq('difficulty', 'hard');
  console.log("IT Hard Questions:", itHard.length);
  const { data: itMed } = await supabase.from('master_trivia_bank').select('question').eq('department', 'IT').eq('difficulty', 'medium');
  console.log("IT Medium Questions:", itMed.length);
  const { data: itEasy } = await supabase.from('master_trivia_bank').select('question').eq('department', 'IT').eq('difficulty', 'easy');
  console.log("IT Easy Questions:", itEasy.length);
  
  const { data: allHard } = await supabase.from('master_trivia_bank').select('question').eq('difficulty', 'hard');
  console.log("All Hard:", allHard.length);
}

check();
