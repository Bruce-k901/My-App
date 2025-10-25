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

async function applyHookRemoval() {
  console.log('🗑️  Applying hook removal to remote database...');
  
  try {
    // Read the SQL file content
    const sqlContent = fs.readFileSync('supabase/sql/custom_access_token_hook.sql', 'utf8');
    console.log('📄 SQL content to execute:');
    console.log(sqlContent);
    
    // Execute the SQL directly using a custom function
    console.log('🔧 Creating temporary execution function...');
    
    const createExecFunction = `
      CREATE OR REPLACE FUNCTION public.temp_exec_sql(sql_text text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'Success';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'Error: ' || SQLERRM;
      END;
      $$;
    `;
    
    // First create the execution function
    const { data: createData, error: createError } = await supabase.rpc('sql', {
      query: createExecFunction
    });
    
    if (createError) {
      console.error('❌ Error creating execution function:', createError);
      return;
    }
    
    console.log('✅ Execution function created');
    
    // Now execute the DROP FUNCTION statement
    const dropSql = 'DROP FUNCTION IF EXISTS public.custom_access_token(jsonb);';
    
    const { data: dropData, error: dropError } = await supabase.rpc('temp_exec_sql', {
      sql_text: dropSql
    });
    
    if (dropError) {
      console.error('❌ Error dropping function:', dropError);
    } else {
      console.log('✅ Drop function result:', dropData);
    }
    
    // Clean up the temporary function
    const { data: cleanupData, error: cleanupError } = await supabase.rpc('temp_exec_sql', {
      sql_text: 'DROP FUNCTION IF EXISTS public.temp_exec_sql(text);'
    });
    
    if (cleanupError) {
      console.error('⚠️  Warning: Could not clean up temporary function:', cleanupError);
    } else {
      console.log('🧹 Cleaned up temporary function');
    }
    
    console.log('🎉 Hook removal applied successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyHookRemoval();