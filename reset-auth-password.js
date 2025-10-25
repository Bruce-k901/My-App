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

async function resetAuthPassword() {
  console.log('🔧 Resetting password for bruce@e-a-g.co...');
  
  const email = 'bruce@e-a-g.co';
  const newPassword = 'testpassword123';
  
  try {
    // Get the user first
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ User not found in auth.users');
      return;
    }
    
    console.log('✅ Found user:', user.id);
    console.log('User details:', {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      created_at: user.created_at
    });
    
    // Update the user's password
    console.log(`🔐 Updating password for ${email}...`);
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
        email_confirm: true // Ensure email is confirmed
      }
    );
    
    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return;
    }
    
    console.log('✅ Password updated successfully');
    console.log('Updated user details:', {
      id: updatedUser.user.id,
      email: updatedUser.user.email,
      email_confirmed_at: updatedUser.user.email_confirmed_at
    });
    
    console.log(`🎉 Password reset completed! You can now login with:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

resetAuthPassword();