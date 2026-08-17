const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
  const { data, error } = await supabase
    .from("session_questions")
    .select("earned_xp, is_correct, questions(game_type_id, game_types(name))")
    .limit(5);
    
  if (error) console.error("Error:", error);
  else console.log("Data:", JSON.stringify(data, null, 2));
}
testQuery();
