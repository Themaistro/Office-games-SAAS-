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

  const { data: hardTrivia } = await supabase
    .from('questions')
    .select('id, difficulty, content')
    .eq('game_type_id', triviaId)
    .eq('difficulty', 'hard')
    .eq('is_active', true);
    
  console.log(`Total active hard trivia questions: ${hardTrivia.length}`);
  
  const noDept = hardTrivia.filter(q => !q.content.department).length;
  const itDept = hardTrivia.filter(q => q.content.department === 'IT').length;
  const genDept = hardTrivia.filter(q => q.content.department === 'General').length;
  const otherDept = hardTrivia.filter(q => q.content.department && q.content.department !== 'IT' && q.content.department !== 'General').length;
  
  console.log(`No dept: ${noDept}, IT dept: ${itDept}, General dept: ${genDept}, Other dept: ${otherDept}`);
}

checkDNS();
