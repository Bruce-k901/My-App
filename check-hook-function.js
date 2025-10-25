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
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function checkHookFunction() {
  console.log('🔍 Checking if custom_access_token function exists...');
  
  try {
    // Check if the function exists in the database
    const { data, error } = await supabase
      .from('pg_proc')
      .select('proname, pronamespace')
      .eq('proname', 'custom_access_token');
    
    if (error) {
      console.error('❌ Error querying pg_proc:', error);
      
      // Try alternative query
      console.log('🔄 Trying alternative query...');
      const { data: altData, error: altError } = await supabase.rpc('sql', {
        query: `
          SELECT routine_name, routine_schema 
          FROM information_schema.routines 
          WHERE routine_name = 'custom_access_token' 
          AND routine_schema = 'public';
        `
      });
      
      if (altError) {
        console.error('❌ Alternative query also failed:', altError);
        return;
      }
      
      console.log('📊 Alternative query result:', altData);
      return;
    }
    
    console.log('📊 Function check result:', data);
    
    if (data && data.length > 0) {
      console.log('⚠️  Function still exists in database!');
      console.log('🔧 Need to manually drop the function...');
    } else {
      console.log('✅ Function does not exist in database');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkHookFunction();