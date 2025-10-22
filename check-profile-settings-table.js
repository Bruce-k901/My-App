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

async function checkProfileSettingsTable() {
  try {
    console.log('Checking for profile_settings table...\n');
    
    // First, let's check what tables exist in the database
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names');
    
    if (tablesError) {
      console.log('RPC function not available, trying direct query...');
      
      // Alternative approach: try to query the table directly
      const { data: testData, error: testError } = await supabase
        .from('profile_settings')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.error('Error querying profile_settings table:', testError);
        console.log('Error code:', testError.code);
        console.log('Error message:', testError.message);
        
        if (testError.code === '42P01') {
          console.log('\n❌ Table "profile_settings" does not exist');
        }
      } else {
        console.log('✅ profile_settings table exists');
        console.log('Sample data:', testData);
      }
    } else {
      console.log('Available tables:', tables);
    }
    
    // Let's also check for similar table names
    console.log('\nChecking for similar table names...');
    
    const possibleTables = [
      'profile_settings',
      'profiles_settings', 
      'user_settings',
      'settings',
      'company_settings',
      'profile_config'
    ];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Found table: ${tableName}`);
          if (data && data.length > 0) {
            console.log(`   Sample columns:`, Object.keys(data[0]));
          }
        }
      } catch (err) {
        // Table doesn't exist, continue
      }
    }
    
    // Check the profiles table structure to see if settings are stored there
    console.log('\nChecking profiles table structure...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (!profileError && profileData && profileData.length > 0) {
      console.log('Profiles table columns:', Object.keys(profileData[0]));
    }
    
  } catch (error) {
    console.error('Error checking profile_settings table:', error);
  }
}

checkProfileSettingsTable();