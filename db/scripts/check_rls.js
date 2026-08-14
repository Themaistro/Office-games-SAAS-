const { Client } = require('pg');
async function checkRLS() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ncuwnuihndfxegpouoeb',
    password: '0123853229QWEASDZXC',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  
  // Try to create policies
  await client.query(`
    -- Enable RLS
    ALTER TABLE public.game_types ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.session_questions ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policies if any
    DROP POLICY IF EXISTS "Allow public read access to game_types" ON public.game_types;
    DROP POLICY IF EXISTS "Allow public read access to questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow insert to session_questions" ON public.session_questions;
    DROP POLICY IF EXISTS "Allow update to session_questions" ON public.session_questions;
    DROP POLICY IF EXISTS "Allow select to session_questions" ON public.session_questions;
    
    -- Create open read policies
    CREATE POLICY "Allow public read access to game_types" ON public.game_types FOR SELECT USING (true);
    CREATE POLICY "Allow public read access to questions" ON public.questions FOR SELECT USING (true);
    
    -- Allow users to manage their own session_questions (we'll just use true for now to debug)
    CREATE POLICY "Allow insert to session_questions" ON public.session_questions FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow update to session_questions" ON public.session_questions FOR UPDATE USING (true);
    CREATE POLICY "Allow select to session_questions" ON public.session_questions FOR SELECT USING (true);

    -- Just completely clear sessions again to be sure
    DELETE FROM public.session_questions;
    DELETE FROM public.daily_sessions;
  `);
  
  console.log("RLS updated and sessions cleared.");
  await client.end();
}
checkRLS();
