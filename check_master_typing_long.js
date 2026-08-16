const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMasterTyping() {
  const { data: masterTyping } = await supabase.from('master_typing_bank').select('prompt_text, difficulty').eq('difficulty', 'hard').limit(5);
  console.log('Sample HARD typing sentences:', JSON.stringify(masterTyping, null, 2));
}

checkMasterTyping();
