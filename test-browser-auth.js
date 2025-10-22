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

// Create client with same config as browser
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "supabase-auth-token",
      flowType: "pkce",
      debug: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web',
      },
    },
  }
);

async function testBrowserAuth() {
  console.log('🔍 Testing browser-like authentication...');
  console.log('Environment variables loaded:');
  console.log('- SUPABASE_URL:', envVars.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
  console.log('- SUPABASE_ANON_KEY:', envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  
  const testEmail = 'bruce@e-a-g.co';
  const testPassword = 'testpassword123';
  
  try {
    // Clear any existing session first
    console.log('\n🧹 Clearing existing session...');
    await supabase.auth.signOut();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to sign in with exact same method as browser
    console.log(`\n🔐 Attempting sign in with: ${testEmail}`);
    console.log(`🔐 Password: ${testPassword}`);
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    console.log('\n📊 Sign in response:');
    console.log('- Data exists:', !!data);
    console.log('- User exists:', !!data?.user);
    console.log('- Session exists:', !!data?.session);
    console.log('- Error:', signInError);
    
    if (signInError) {
      console.error('\n❌ Sign in failed with error:', signInError);
      console.error('Error code:', signInError.status);
      console.error('Error message:', signInError.message);
      
      // Check if it's a credentials issue
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('\n🔍 Checking user existence in database...');
        
        // Try to find the user in profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', testEmail);
          
        console.log('Profiles query result:', { profiles, error: profileError });
        
        // Also check auth.users if we have admin access
        console.log('\n🔍 This might be an auth.users vs profiles mismatch issue.');
        console.log('The user might exist in profiles but not in auth.users table.');
      }
      
      return;
    }
    
    console.log('\n✅ Sign in successful!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    console.log('Email confirmed:', data.user.email_confirmed_at);
    console.log('Session access token exists:', !!data.session?.access_token);
    
  } catch (error) {
    console.error('\n❌ Unexpected error during authentication:', error);
  }
}

testBrowserAuth();