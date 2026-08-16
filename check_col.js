const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function alterTable() {
  const query = `
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  `;
  
  // Since we don't have direct SQL execution via the JS client, we'll try an RPC
  // Wait, if RPC isn't defined for raw SQL, we can't alter tables from JS client.
  // Instead, I'll provide this script to check if the column exists by selecting it.
  
  const { data, error } = await supabase.from('profiles').select('is_active').limit(1);
  if (error && error.code === '42703') { // column does not exist
    console.log("is_active column missing. Must run SQL in Supabase dashboard or via API.");
  } else {
    console.log("is_active column exists or other error:", error);
  }
}

alterTable();
