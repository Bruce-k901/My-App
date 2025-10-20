const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rnbwgqjqtdwxqvkqvhxb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuYndncWpxdGR3eHF2a3F2aHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY2NjI4NzEsImV4cCI6MjA0MjIzODg3MX0.YGGJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJhJaKJhGJ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSitesTable() {
  try {
    console.log('Checking sites table structure...');
    
    // Try to select all columns with limit 1 to see what exists
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error querying sites table:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Sites table columns found:');
      Object.keys(data[0]).forEach(column => {
        console.log(`- ${column}`);
      });
    } else {
      console.log('Sites table exists but no data found');
      
      // Try to get column info by attempting to select specific fields
      const testFields = [
        'id', 'name', 'address_line1', 'address_line2', 'city', 'postcode',
        'gm_user_id', 'contact_name', 'contact_email', 'contact_phone',
        'country', 'region', 'site_type', 'floor_area', 'opening_date',
        'status', 'created_by', 'company_id', 'created_at', 'updated_at'
      ];
      
      console.log('Testing individual fields:');
      for (const field of testFields) {
        try {
          await supabase.from('sites').select(field).limit(0);
          console.log(`✓ ${field} - exists`);
        } catch (err) {
          console.log(`✗ ${field} - does not exist`);
        }
      }
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

checkSitesTable();