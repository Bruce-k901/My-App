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

async function fixProfileAuthLinkage() {
  console.log('🔧 Fixing profile-auth linkage...');
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }
    
    console.log(`✅ Found ${authUsers.users.length} auth users`);
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, auth_user_id');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`✅ Found ${profiles.length} profiles`);
    
    // Match profiles to auth users by email
    for (const authUser of authUsers.users) {
      const matchingProfile = profiles.find(p => p.email === authUser.email);
      
      if (matchingProfile) {
        if (matchingProfile.auth_user_id !== authUser.id) {
          console.log(`🔗 Linking profile ${matchingProfile.email} to auth user ${authUser.id}`);
          
          // Update the profile to link to auth user
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ auth_user_id: authUser.id })
            .eq('id', matchingProfile.id);
          
          if (updateError) {
            console.error(`❌ Error updating profile ${matchingProfile.email}:`, updateError);
          } else {
            console.log(`✅ Successfully linked profile ${matchingProfile.email}`);
          }
        } else {
          console.log(`✅ Profile ${matchingProfile.email} already linked correctly`);
        }
      } else {
        console.log(`⚠️  No profile found for auth user ${authUser.email}`);
      }
    }
    
    // Check for profiles without auth users
    for (const profile of profiles) {
      const matchingAuthUser = authUsers.users.find(u => u.email === profile.email);
      if (!matchingAuthUser) {
        console.log(`⚠️  Profile ${profile.email} has no matching auth user`);
      }
    }
    
    console.log('🎉 Profile-auth linkage fix completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixProfileAuthLinkage();