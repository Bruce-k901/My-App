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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  console.log('🔍 Creating test user...\n');
  
  const testUser = {
    email: "test@checkly.com",
    password: "testpassword123",
    firstName: "Test",
    lastName: "User",
    companyName: "Test Company"
  };
  
  try {
    // 1. Create auth user
    console.log('1️⃣ Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        first_name: testUser.firstName,
        last_name: testUser.lastName
      }
    });
    
    if (authError) {
      console.error('❌ Auth user creation error:', authError);
      return;
    }
    
    console.log('✅ Auth user created:', authData.user.id);
    
    // 2. Create company
    console.log('\n2️⃣ Creating company...');
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: testUser.companyName,
        user_id: authData.user.id,
        setup_status: 'completed',
        active: true
      }])
      .select()
      .single();
    
    if (companyError) {
      console.error('❌ Company creation error:', companyError);
      return;
    }
    
    console.log('✅ Company created:', companyData.id);
    
    // 3. Create profile
    console.log('\n3️⃣ Creating profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: testUser.email,
        full_name: `${testUser.firstName} ${testUser.lastName}`,
        company_id: companyData.id,
        app_role: 'admin',
        position_title: 'Administrator'
      }])
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      return;
    }
    
    console.log('✅ Profile created');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 TEST USER CREATED SUCCESSFULLY!');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 Password:', testUser.password);
    console.log('🏢 Company ID:', companyData.id);
    console.log('👤 User ID:', authData.user.id);
    console.log('\nYou can now log in with these credentials.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestUser();