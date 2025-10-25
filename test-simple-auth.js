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

// Create a simple Supabase client
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

async function testSimpleAuth() {
  console.log('🧪 Testing simple authentication...');
  console.log('📍 Supabase URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
  
  const email = 'bruce@e-a-g.co';
  const password = 'testpassword123';
  
  try {
    console.log(`🔐 Attempting sign in with: ${email}`);
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      return;
    }
    
    console.log('✅ Sign in successful!');
    console.log('📊 User data:', {
      id: data.user?.id,
      email: data.user?.email,
      created_at: data.user?.created_at,
      last_sign_in_at: data.user?.last_sign_in_at
    });
    
    console.log('📊 Session data:', {
      access_token: data.session?.access_token ? 'Present' : 'Missing',
      refresh_token: data.session?.refresh_token ? 'Present' : 'Missing',
      expires_at: data.session?.expires_at,
      token_type: data.session?.token_type
    });
    
    // Test fetching profile data
    console.log('🔍 Fetching profile data...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError);
    } else {
      console.log('✅ Profile data:', {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        company_id: profile.company_id,
        app_role: profile.app_role,
        auth_user_id: profile.auth_user_id
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSimpleAuth();