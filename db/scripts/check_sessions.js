const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: session } = await supabase
    .from('daily_sessions')
    .select('id, user_id, date, is_completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!session) return console.log('No sessions found');
  
  const { data: qs } = await supabase
    .from('session_questions')
    .select('order_index, is_completed, questions(game_types(slug, name), difficulty, content)')
    .eq('session_id', session.id)
    .order('order_index', { ascending: true });

  console.log(`Session ${session.id} qs: ${qs.length}`);
  qs.forEach(q => {
    console.log(`[${q.order_index}] ${q.questions.game_types.slug} - diff: ${q.questions.difficulty} - content: ${Object.keys(q.questions.content)}`);
  });
}
run();
