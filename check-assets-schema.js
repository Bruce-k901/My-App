const { createClient } = require('@supabase/supabase-js');

// Use hardcoded values for now since we can't access .env.local easily
const supabase = createClient(
  'https://ixqvqhqjqjqjqjqjqjqj.supabase.co', // Replace with actual URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Replace with actual anon key
);

async function checkSchema() {
  try {
    console.log('Checking assets table schema...\n');
    
    // First, let's try to get a sample record to see the actual structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error fetching sample data:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('Sample asset record structure:');
      console.log('================================');
      const sample = sampleData[0];
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = typeof value;
        console.log(`${key.padEnd(25)} | ${type.padEnd(10)} | ${value === null ? 'NULL' : String(value).substring(0, 30)}`);
      });
    } else {
      console.log('No assets found in the table');
    }
    
    // Also try to get schema information if possible
    console.log('\n\nTrying to get schema information...');
    const { data: schemaData, error: schemaError } = await supabase.rpc('get_table_columns', { table_name: 'assets' });
    
    if (schemaError) {
      console.log('Schema RPC not available:', schemaError.message);
    } else {
      console.log('Schema data:', schemaData);
    }
    
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

checkSchema();