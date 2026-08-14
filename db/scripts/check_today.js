const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: questions } = await supabase
    .from('questions')
    .select('id, game_type_id, game_types (name, slug)')
    .gte('created_at', twoHoursAgo);
  
  const counts = {};
  questions.forEach(q => {
    const name = q.game_types?.name || q.game_type_id;
    counts[name] = (counts[name] || 0) + 1;
  });
  console.log('Question counts by game type:', counts);
}
run();
