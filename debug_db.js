require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('chess_games').select('*').order('created_at', {ascending: false}).limit(1).then(r => console.log(JSON.stringify(r.data, null, 2)));
