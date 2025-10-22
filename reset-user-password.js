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

async function resetUserPassword() {
  console.log('🔍 Resetting password for bruce@e-a-g.co...\n');
  
  const userEmail = "bruce@e-a-g.co";
  const newPassword = "testpassword123";
  
  try {
    // Get the user by email
    console.log('1️⃣ Finding user...');
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const user = users.users.find(u => u.email === userEmail);
    if (!user) {
      console.error('❌ User not found:', userEmail);
      return;
    }
    
    console.log('✅ User found:', user.id);
    
    // Update the user's password
    console.log('\n2️⃣ Updating password...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error('❌ Password update error:', updateError);
      return;
    }
    
    console.log('✅ Password updated successfully');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 PASSWORD RESET SUCCESSFUL!');
    console.log('📧 Email:', userEmail);
    console.log('🔑 New Password:', newPassword);
    console.log('\nYou can now log in with these credentials.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

resetUserPassword();