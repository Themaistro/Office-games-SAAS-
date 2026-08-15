require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testRegister() {
  const email = `test_user_${Date.now()}@example.com`;
  console.log(`Attempting to register: ${email}`);
  
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: 'password123',
    options: {
      data: {
        full_name: 'Test User',
        department: 'Engineering',
        position: 'Tester'
      }
    }
  });

  if (error) {
    console.error("Signup error:", error);
    return;
  }

  console.log("Signup successful!");
  console.log("Session exists:", !!data.session);
  console.log("User:", data.user?.id);

  // Check if profile was created
  if (data.user) {
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profError) {
      console.error("Profile fetch error:", profError);
    } else {
      console.log("Profile created successfully:", profile);
    }
  }
}

testRegister();
