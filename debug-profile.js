const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xijoybubtrgbrhquqwrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpam95YnVidHJnYnJocXVxd3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI2NzI2MSwiZXhwIjoyMDc1ODQzMjYxfQ.sZ9coWo06X5esoYG39udHXRfwfIWw1DModoxyAvh4O4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserDetails() {
  console.log('🔍 Checking user details...\n');
  
  const userDetails = {
    id: "812ad316-37a1-469a-887c-923a3b3af37a",
    auth_user_id: "8066c4f2-fbff-4255-be96-71acf151473d", 
    company_id: "f99510bc-b290-47c6-8f12-282bea67bd91",
    app_role: "admin"
  };
  
  console.log('Expected user details:', userDetails);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    // 1. Check profiles table
    console.log('1️⃣ Checking profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userDetails.auth_user_id);
    
    if (profileError) {
      console.error('❌ Profile query error:', profileError);
    } else {
      console.log('✅ Profiles found:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        console.log('Profile data:', profiles[0]);
        
        // Check if company_id matches
        if (profiles[0].company_id === userDetails.company_id) {
          console.log('✅ Company ID matches!');
        } else {
          console.log('❌ Company ID mismatch!');
          console.log('  Expected:', userDetails.company_id);
          console.log('  Found:', profiles[0].company_id);
        }
      }
    }
    
    // 2. Check companies table
    console.log('\n2️⃣ Checking companies table...');
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userDetails.company_id);
    
    if (companyError) {
      console.error('❌ Company query error:', companyError);
    } else {
      console.log('✅ Companies found:', companies?.length || 0);
      if (companies && companies.length > 0) {
        console.log('Company data:', {
          id: companies[0].id,
          name: companies[0].name,
          setup_status: companies[0].setup_status,
          active: companies[0].active
        });
      }
    }
    
    // 3. Check sites for this company
    console.log('\n3️⃣ Checking sites for company...');
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('*')
      .eq('company_id', userDetails.company_id);
    
    if (sitesError) {
      console.error('❌ Sites query error:', sitesError);
    } else {
      console.log('✅ Sites found:', sites?.length || 0);
      if (sites && sites.length > 0) {
        console.log('Sites data:');
        sites.forEach((site, index) => {
          console.log(`  ${index + 1}. ${site.name} (${site.id})`);
        });
      }
    }
    
    // 4. Check auth.users (if accessible)
    console.log('\n4️⃣ Checking auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('⚠️ Auth users not accessible with current permissions:', authError.message);
    } else {
      const matchingUser = authUsers.users?.find(u => u.id === userDetails.auth_user_id);
      if (matchingUser) {
        console.log('✅ Auth user found:', {
          id: matchingUser.id,
          email: matchingUser.email,
          created_at: matchingUser.created_at
        });
      } else {
        console.log('❌ Auth user not found');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 SUMMARY:');
    console.log('Profile ID to check:', userDetails.auth_user_id);
    console.log('Company ID to check:', userDetails.company_id);
    console.log('Expected role:', userDetails.app_role);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUserDetails();