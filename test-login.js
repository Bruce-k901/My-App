const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local manually
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.log('No .env.local file found, using system environment variables');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🔍 Testing login flow...\n');
  
  const credentials = {
    email: "bruce@e-a-g.co",
    password: "testpassword123"
  };
  
  try {
    // 1. Sign in
    console.log('1️⃣ Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword(credentials);
    
    if (authError) {
      console.error('❌ Sign in error:', authError);
      return;
    }
    
    console.log('✅ Signed in successfully');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    
    // 2. Get user profile
    console.log('\n2️⃣ Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return;
    }
    
    console.log('✅ Profile found:');
    console.log('   Full Name:', profile.full_name);
    console.log('   Company ID:', profile.company_id);
    console.log('   App Role:', profile.app_role);
    
    // 3. Get company info
    console.log('\n3️⃣ Fetching company info...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
    
    if (companyError) {
      console.error('❌ Company error:', companyError);
      return;
    }
    
    console.log('✅ Company found:');
    console.log('   Name:', company.name);
    console.log('   Setup Status:', company.setup_status);
    console.log('   Active:', company.active);
    
    // 4. Test contractors fetch
    console.log('\n4️⃣ Testing contractors fetch...');
    const { data: contractors, error: contractorsError } = await supabase
      .from('contractors')
      .select('*')
      .eq('company_id', profile.company_id)
      .limit(5);
    
    if (contractorsError) {
      console.error('❌ Contractors error:', contractorsError);
    } else {
      console.log('✅ Contractors found:', contractors.length);
      contractors.forEach(contractor => {
        console.log(`   - ${contractor.name} (${contractor.email})`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 LOGIN TEST SUCCESSFUL!');
    console.log('The user authentication and data flow is working correctly.');
    console.log('AppContext should now be able to load the company data.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testLogin();