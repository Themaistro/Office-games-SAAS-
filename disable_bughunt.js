const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableBugHunt() {
  const { error } = await supabase
    .from('game_types')
    .update({ is_active: false })
    .eq('slug', 'coding');
    
  if (error) {
    console.error('Failed to disable Bug Hunt:', error);
  } else {
    console.log('Successfully disabled Bug Hunt in the database.');
  }
}

disableBugHunt();
