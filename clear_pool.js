const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Wiping daily session and questions cache...");
  
  await supabase.from("daily_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("Done! The next time a session is started, new cards will be generated.");
}

main();
