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

async function dropHookFunction() {
  console.log('🗑️  Dropping custom_access_token function...');
  
  try {
    // Execute the DROP FUNCTION statement
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'DROP FUNCTION IF EXISTS public.custom_access_token(jsonb);'
    });
    
    if (error) {
      console.error('❌ Error dropping function:', error);
      
      // Try alternative approach using raw SQL
      console.log('🔄 Trying alternative approach...');
      
      // Create a simple function to execute raw SQL
      const { data: createData, error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.drop_custom_hook()
          RETURNS void
          LANGUAGE plpgsql
          AS $$
          BEGIN
            DROP FUNCTION IF EXISTS public.custom_access_token(jsonb);
          END;
          $$;
        `
      });
      
      if (createError) {
        console.error('❌ Error creating drop function:', createError);
        return;
      }
      
      // Execute the drop function
      const { data: execData, error: execError } = await supabase.rpc('drop_custom_hook');
      
      if (execError) {
        console.error('❌ Error executing drop function:', execError);
        return;
      }
      
      console.log('✅ Function dropped using alternative approach');
      
      // Clean up the helper function
      await supabase.rpc('exec_sql', {
        sql: 'DROP FUNCTION IF EXISTS public.drop_custom_hook();'
      });
      
      return;
    }
    
    console.log('✅ Function dropped successfully');
    console.log('📊 Result:', data);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

dropHookFunction();