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
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSession() {
  try {
    console.log('Testing session retrieval...\n');
    
    // Test getting session (this simulates what middleware does)
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('Session data:', session);
    console.log('Session error:', error);
    
    if (session) {
      console.log('\nSession details:');
      console.log('- User ID:', session.user.id);
      console.log('- Email:', session.user.email);
      console.log('- Expires at:', new Date(session.expires_at * 1000));
      console.log('- Access token present:', !!session.access_token);
      console.log('- Refresh token present:', !!session.refresh_token);
    } else {
      console.log('\nNo active session found');
    }
    
    // Test getting user (alternative approach)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('\nUser data:', user);
    console.log('User error:', userError);
    
  } catch (error) {
    console.error('Error testing session:', error);
  }
}

testSession();