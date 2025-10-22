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

async function checkExistingUsers() {
  console.log('🔍 Checking existing users...\n');
  
  try {
    // Check profiles
    console.log('1️⃣ Checking profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    if (profilesError) {
      console.error('❌ Profiles error:', profilesError);
    } else {
      console.log('✅ Found profiles:', profiles.length);
      profiles.forEach(profile => {
        console.log(`   - ${profile.email} (ID: ${profile.id}, Company: ${profile.company_id})`);
      });
    }
    
    // Check companies
    console.log('\n2️⃣ Checking companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(10);
    
    if (companiesError) {
      console.error('❌ Companies error:', companiesError);
    } else {
      console.log('✅ Found companies:', companies.length);
      companies.forEach(company => {
        console.log(`   - ${company.name} (ID: ${company.id}, User: ${company.user_id})`);
      });
    }
    
    // Check auth users (this might not work with service key)
    console.log('\n3️⃣ Checking auth users...');
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Auth users error:', authError);
      } else {
        console.log('✅ Found auth users:', authUsers.users.length);
        authUsers.users.forEach(user => {
          console.log(`   - ${user.email} (ID: ${user.id})`);
        });
      }
    } catch (error) {
      console.log('⚠️ Could not fetch auth users:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkExistingUsers();