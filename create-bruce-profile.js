const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBruceProfile() {
  try {
    console.log('Creating profile for bruce@e-a-g.co...\n');
    
    // First, get the user ID for bruce@e-a-g.co
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    const bruceUser = users.users.find(user => user.email === 'bruce@e-a-g.co');
    
    if (!bruceUser) {
      console.error('User bruce@e-a-g.co not found');
      return;
    }
    
    console.log(`Found user: ${bruceUser.email} (ID: ${bruceUser.id})`);
    
    // Use the same company_id as the other users
    const companyId = 'f99510bc-b290-47c6-8f12-282bea67bd91';
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', bruceUser.id)
      .single();
    
    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      return;
    }
    
    // Create the profile
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: bruceUser.id,
        email: bruceUser.email,
        company_id: companyId,
        full_name: 'Bruce',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }
    
    console.log('Profile created successfully:', newProfile);
    
    // Verify the profile was created
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'bruce@e-a-g.co')
      .single();
    
    if (verifyError) {
      console.error('Error verifying profile:', verifyError);
    } else {
      console.log('Profile verification successful:', verifyProfile);
    }
    
  } catch (error) {
    console.error('Error creating Bruce profile:', error);
  }
}

createBruceProfile();