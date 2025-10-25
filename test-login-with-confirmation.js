const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const readline = require('readline');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function testLoginWithConfirmation() {
  console.log('🧪 Testing login with user confirmation...');
  console.log('📍 Supabase URL:', envVars.NEXT_PUBLIC_SUPABASE_URL);
  
  const email = 'bruce@e-a-g.co';
  const password = 'testpassword123';
  
  console.log(`\n🔐 About to attempt login with:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  
  const confirmation = await askQuestion('\n❓ Do you want to proceed with this login attempt? (y/n): ');
  
  if (confirmation.toLowerCase() !== 'y' && confirmation.toLowerCase() !== 'yes') {
    console.log('❌ Login attempt cancelled by user.');
    rl.close();
    return;
  }
  
  try {
    console.log(`\n🔄 Attempting sign in...`);
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      rl.close();
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

    // Try to fetch profile data
    console.log('\n🔍 Fetching profile data...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user?.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError.message);
    } else {
      console.log('✅ Profile data:', profile);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  rl.close();
}

testLoginWithConfirmation();