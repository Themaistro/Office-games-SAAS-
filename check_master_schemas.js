const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchemas() {
  const tables = [
    'master_trivia_bank',
    'master_typing_bank',
    'master_card_match_bank',
    'master_logic_bank',
    'master_sudoku_bank',
    'master_word_bank',
    'master_odd_object_bank',
    'master_coding_bank'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} error:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`Table ${table} keys:`, Object.keys(data[0]));
    } else {
      console.log(`Table ${table} is empty or doesn't exist.`);
    }
  }
}

checkSchemas();
