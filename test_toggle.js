const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length > 0) acc[k.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const gameId = '2d10d2b6-e6d8-4227-b98b-7c1782c3d900'; // Word
  
  // Try using the regular client (how Next.js server actions do it without service role)
  // Wait, the next.js action uses createClient() from @/lib/supabase/server which uses the user's cookie.
  
  console.log("Fetching game:", gameId);
  let { data: gameBefore } = await supabase.from("game_types").select("is_active").eq("id", gameId).single();
  console.log("Before update:", gameBefore);

  console.log("Attempting to toggle game (service role):", gameId);
  const { error } = await supabase
    .from("game_types")
    .update({ is_active: !gameBefore.is_active })
    .eq("id", gameId);
    
  console.log("Update Error:", error);
  
  let { data: gameAfter } = await supabase.from("game_types").select("is_active").eq("id", gameId).single();
  console.log("After update:", gameAfter);
}

test();
