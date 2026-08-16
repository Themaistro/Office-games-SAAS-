const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTyping() {
  const { data: games } = await supabase.from('game_types').select('*').eq('slug', 'speed-typing');
  const typingId = games[0].id;

  const { data: allTyping } = await supabase
    .from('questions')
    .select('id, difficulty, content')
    .eq('game_type_id', typingId)
    .eq('is_active', true);
    
  console.log(`Total active typing questions in DB: ${allTyping.length}`);
  
  const easy = allTyping.filter(q => q.difficulty === 'easy').length;
  const med = allTyping.filter(q => q.difficulty === 'medium').length;
  const hard = allTyping.filter(q => q.difficulty === 'hard').length;
  console.log(`Easy: ${easy}, Medium: ${med}, Hard: ${hard}`);
  
  if (allTyping.length > 0) {
    console.log('Sample typing questions:', JSON.stringify(allTyping.slice(0, 3).map(q => q.content.text), null, 2));
  }
}

checkTyping();
