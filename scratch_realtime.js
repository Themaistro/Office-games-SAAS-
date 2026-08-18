const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function enableRealtime() {
  const tables = ['chess_games', 'ttt_games', 'profiles', 'daily_sessions', 'announcements', 'system_settings'];
  
  for (const table of tables) {
    console.log(`Checking/enabling realtime for ${table}...`);
    // Unfortunately, we can't run raw SQL easily via the JS client unless there is an RPC.
    // Wait, let's see if there is an rpc 'exec' or 'query'.
  }
}

enableRealtime();
