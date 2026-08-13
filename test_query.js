const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from("questions")
    .select(`
      id, game_type_id, difficulty,
      game_types!inner (id, name, slug, is_active)
    `)
    .eq("is_active", true)
    .eq("game_types.is_active", true);

  console.log('Error:', error);
  console.log('Count:', data ? data.length : 0);
}

test();
