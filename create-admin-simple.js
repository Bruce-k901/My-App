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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xijoybubtrgbrhquqwrx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

(async () => {
  console.log('🔍 Creating admin user (bypassing trigger)...\n');
  
  try {
    // Step 1: Temporarily disable the trigger
    console.log('1️⃣ Temporarily disabling trigger...');
    await supabase.rpc('exec', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    });
    
    // Step 2: Create the user
    console.log('2️⃣ Creating auth user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'newadmin@yourdomain.com',
      password: 'TempPass123!',
      email_confirm: true,
    });
    
    if (error) {
      console.error('❌ Error creating admin user:', error);
      return;
    }
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', data.user.email);
    console.log('🆔 User ID:', data.user.id);
    
    // Step 3: Manually create the profile
    console.log('3️⃣ Creating admin profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        email: data.user.email,
        full_name: 'Admin User',
        app_role: 'admin',
        position_title: 'System Administrator'
      }])
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Error creating admin profile:', profileError);
    } else {
      console.log('✅ Admin profile created successfully!');
      console.log('👤 Profile ID:', profileData.id);
    }
    
    // Step 4: Re-enable the trigger
    console.log('4️⃣ Re-enabling trigger...');
    await supabase.rpc('exec', {
      sql: `
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
      `
    });
    console.log('✅ Trigger re-enabled');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
})();