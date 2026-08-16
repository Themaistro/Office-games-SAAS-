const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTodaysTyping() {
  const { data: games } = await supabase.from('game_types').select('*').eq('slug', 'typing');
  const typingId = games[0].id;
  
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: todaysTyping } = await supabase
    .from('questions')
    .select('id, difficulty, content')
    .eq('game_type_id', typingId)
    .gte('created_at', twoHoursAgo)
    .eq('is_active', true);
    
  console.log(`Total active typing questions generated today: ${todaysTyping.length}`);
  if (todaysTyping.length > 0) {
    const easy = todaysTyping.filter(q => q.difficulty === 'easy').map(q => q.content);
    console.log(`Easy count: ${easy.length}`);
    console.log('Sample easy:', easy.slice(0, 3));
  }
}

checkTodaysTyping();
