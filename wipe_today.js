const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeToday() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  // Wipe session pools
  const { error: err1 } = await supabase.from('session_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Wiped session questions:', err1 || 'success');

  // Set all generated questions today to inactive
  const { error: err2 } = await supabase.from('questions').update({ is_active: false }).gte('created_at', twoHoursAgo);
  console.log('Deactivated today generated questions:', err2 || 'success');
}

wipeToday();
