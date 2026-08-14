const { Client } = require('pg');

async function applySql() {
  const connectionString = 'postgresql://postgres.ncuwnuihndfxegpouoeb:0123853229QWEASDZXC@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    console.log('Adding department column...');
    await client.query('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;');
    
    console.log('Adding position column...');
    await client.query('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text;');

    console.log('Updating handle_new_user trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user() 
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, full_name, avatar_url, department, position)
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'avatar_url',
          NEW.raw_user_meta_data->>'department',
          NEW.raw_user_meta_data->>'position'
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log('SQL applied successfully!');
  } catch (err) {
    console.error('Error applying SQL:', err);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

applySql();
