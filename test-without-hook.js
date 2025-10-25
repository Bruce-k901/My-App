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

async function testWithoutHook() {
  console.log('🧪 Testing authentication without hook...');
  
  // Create a test user directly in auth.users to bypass any hook issues
  const adminClient = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const testEmail = 'test-no-hook@example.com';
  const testPassword = 'testpassword123';
  
  try {
    console.log('🔧 Creating test user without profile...');
    
    // Delete test user if exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === testEmail);
    
    if (existingUser) {
      console.log('🗑️  Deleting existing test user...');
      await adminClient.auth.admin.deleteUser(existingUser.id);
    }
    
    // Create new test user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (createError) {
      console.error('❌ Error creating test user:', createError);
      return;
    }
    
    console.log('✅ Test user created:', newUser.user.id);
    
    // Now try to sign in with this user
    const clientForTest = createClient(
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
    
    console.log('🔐 Attempting sign in with test user...');
    
    const { data: signInData, error: signInError } = await clientForTest.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
      console.error('Error details:', {
        message: signInError.message,
        status: signInError.status,
        code: signInError.code
      });
    } else {
      console.log('✅ Sign in successful with test user!');
      console.log('📊 User data:', {
        id: signInData.user?.id,
        email: signInData.user?.email
      });
    }
    
    // Clean up test user
    console.log('🧹 Cleaning up test user...');
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testWithoutHook();