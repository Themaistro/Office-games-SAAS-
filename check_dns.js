const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDNS() {
  const { data: games } = await supabase.from('game_types').select('*').eq('slug', 'trivia');
  const triviaId = games[0].id;

  const { data: allTrivia } = await supabase
    .from('questions')
    .select('id, difficulty, content')
    .eq('game_type_id', triviaId)
    .eq('is_active', true);
    
  console.log(`Total active trivia questions in DB: ${allTrivia.length}`);
  
  const easy = allTrivia.filter(q => q.difficulty === 'easy').length;
  const med = allTrivia.filter(q => q.difficulty === 'medium').length;
  const hard = allTrivia.filter(q => q.difficulty === 'hard').length;
  console.log(`Easy: ${easy}, Medium: ${med}, Hard: ${hard}`);
  
  const dns = allTrivia.filter(q => q.content.question && q.content.question.includes('DNS'));
  console.log('DNS questions:', JSON.stringify(dns, null, 2));
}

checkDNS();
