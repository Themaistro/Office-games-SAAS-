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
  const { data: g } = await supabase.from('game_types').select('*').limit(1).single();
  const newQ = {
    game_type_id: g.id,
    difficulty: 'easy',
    content: { test: true },
    options: [],
    correct_answer: 'test',
    base_xp: 100,
    is_active: false
  };

  const { data: inserted, error } = await supabase
    .from('questions')
    .insert([newQ])
    .select('id, game_types (id, name, slug)');

  console.log("Inserted:", JSON.stringify(inserted, null, 2));
  console.log("Error:", error);
}

check();
