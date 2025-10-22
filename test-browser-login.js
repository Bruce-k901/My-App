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

async function testBrowserLogin() {
  console.log('🔐 Testing browser login flow...');
  
  try {
    // Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'bruce@e-a-g.co',
      password: 'testpassword123'
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
      return;
    }
    
    console.log('✅ Sign in successful');
    console.log('User ID:', signInData.user.id);
    console.log('Session:', !!signInData.session);
    
    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signInData.user.id)
      .single();
      
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError);
      return;
    }
    
    console.log('✅ Profile found');
    console.log('Company ID:', profile.company_id);
    console.log('Email:', profile.email);
    
    // Get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
      
    if (companyError) {
      console.error('❌ Company fetch failed:', companyError);
      return;
    }
    
    console.log('✅ Company found');
    console.log('Company name:', company.name);
    console.log('Setup status:', company.setup_status);
    
    console.log('🎉 All authentication steps successful!');
    console.log('The issue is likely in the browser/client-side code.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testBrowserLogin();