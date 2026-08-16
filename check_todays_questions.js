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
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("questions")
    .select("game_type_id, difficulty, game_types (slug)")
    .gte("created_at", twoHoursAgo);

  if (error) {
    console.log(error);
    return;
  }
  
  const grouped = data.reduce((acc, q) => {
    const slug = q.game_types?.slug || q.game_type_id;
    if (!acc[slug]) acc[slug] = { easy: 0, medium: 0, hard: 0 };
    if (acc[slug][q.difficulty] !== undefined) {
      acc[slug][q.difficulty]++;
    }
    return acc;
  }, {});

  console.log(grouped);
}

check();
