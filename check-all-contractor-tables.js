const { createClient } = require('@supabase/supabase-js');

// Read environment variables directly
const fs = require('fs');
const path = require('path');

let supabaseUrl, supabaseKey;

try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.error('Error reading .env.local:', err.message);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllContractorTables() {
  console.log('🔍 Checking all contractor-related tables...\n');

  const tables = [
    'contractors',
    'maintenance_contractors', 
    'contractors_redundant',
    'contractors_backup'
  ];

  for (const table of tables) {
    try {
      console.log(`📊 Checking table: ${table}`);
      
      // Get total count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`   ❌ Error: ${countError.message}`);
        continue;
      }

      console.log(`   📈 Total records: ${count}`);

      if (count > 0) {
        // Get sample data to see structure
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(3);

        if (error) {
          console.log(`   ❌ Error fetching sample: ${error.message}`);
        } else {
          console.log(`   📋 Sample record structure:`, Object.keys(data[0] || {}));
          
          // Check for company_id distribution
          const { data: companyData, error: companyError } = await supabase
            .from(table)
            .select('company_id')
            .not('company_id', 'is', null);

          if (!companyError && companyData) {
            const companyIds = [...new Set(companyData.map(r => r.company_id))];
            console.log(`   🏢 Unique company IDs: ${companyIds.length}`);
            companyIds.forEach(id => console.log(`      - ${id}`));
          }
        }
      }
      
      console.log('');
    } catch (err) {
      console.log(`   ❌ Table ${table} might not exist: ${err.message}\n`);
    }
  }

  // Also check views
  console.log('🔍 Checking contractor views...\n');
  
  try {
    const { data: viewData, error: viewError } = await supabase
      .from('contractors_export')
      .select('*', { count: 'exact', head: true });
      
    if (!viewError) {
      console.log(`📊 contractors_export view: ${viewData} records`);
    }
  } catch (err) {
    console.log('❌ contractors_export view not accessible');
  }
}

checkAllContractorTables().catch(console.error);