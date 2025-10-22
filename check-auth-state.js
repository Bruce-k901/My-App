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

async function checkAuthState() {
  try {
    console.log('Checking authentication state...\n');
    
    // Check if there are any active sessions
    const { data: sessions, error: sessionsError } = await supabase.auth.admin.listUsers();
    
    if (sessionsError) {
      console.error('Error fetching users:', sessionsError);
      return;
    }
    
    console.log(`Total users in system: ${sessions.users.length}`);
    
    // Check for users with recent activity
    const recentUsers = sessions.users.filter(user => {
      const lastSignIn = new Date(user.last_sign_in_at || 0);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastSignIn > oneDayAgo;
    });
    
    console.log(`Users with activity in last 24h: ${recentUsers.length}`);
    
    if (recentUsers.length > 0) {
      console.log('\nRecent users:');
      recentUsers.forEach(user => {
        console.log(`- ${user.email} (last sign in: ${user.last_sign_in_at})`);
      });
    }
    
    // Check profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, company_id')
      .limit(5);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log(`\nProfiles in database: ${profiles.length}`);
      profiles.forEach(profile => {
        console.log(`- ${profile.email} (company_id: ${profile.company_id})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking auth state:', error);
  }
}

checkAuthState();