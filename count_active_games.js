const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function countGames() {
  const { data, error } = await supabase
    .from('game_types')
    .select('name, slug, is_active');
    
  if (error) {
    console.error('Error fetching games:', error);
  } else {
    const active = data.filter(g => g.is_active);
    console.log(`Total games: ${data.length}`);
    console.log(`Active games: ${active.length}`);
    console.log('Active Game Names:');
    active.forEach(g => console.log(`- ${g.name} (${g.slug})`));
  }
}

countGames();
