const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyCredentials() {
  console.log('🔍 Verifying user credentials...');
  
  const testEmail = 'bruce@e-a-g.co';
  const testPassword = 'testpassword123';
  
  try {
    // Try to sign in
    console.log(`🔐 Attempting to sign in with: ${testEmail}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      console.error('Error details:', error);
      
      // Let's check if the user exists in auth.users
      console.log('\n🔍 Checking if user exists in database...');
      
      // Check profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', testEmail)
        .single();
        
      if (profileError) {
        console.log('❌ Profile not found:', profileError.message);
      } else {
        console.log('✅ Profile found:', {
          id: profile.id,
          email: profile.email,
          company_id: profile.company_id
        });
      }
      
      return;
    }
    
    console.log('✅ Sign in successful!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Session exists:', !!data.session);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyCredentials();