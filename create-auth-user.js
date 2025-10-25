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
  envVars.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
);

async function createAuthUser() {
  console.log('🔧 Creating auth user for bruce@e-a-g.co...');
  
  const email = 'bruce@e-a-g.co';
  const password = 'testpassword123';
  
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      console.log('✅ Auth user already exists:', existingUser.id);
      return existingUser;
    }
    
    // Create the auth user
    console.log(`🔐 Creating auth user for ${email}...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: 'Bruce Operator'
      }
    });
    
    if (createError) {
      console.error('❌ Error creating auth user:', createError);
      return null;
    }
    
    console.log('✅ Auth user created successfully:', newUser.user.id);
    
    // Now link the profile to this auth user
    const { error: linkError } = await supabase
      .from('profiles')
      .update({ auth_user_id: newUser.user.id })
      .eq('email', email);
    
    if (linkError) {
      console.error('❌ Error linking profile to auth user:', linkError);
    } else {
      console.log('✅ Profile linked to auth user successfully');
    }
    
    return newUser.user;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return null;
  }
}

createAuthUser();