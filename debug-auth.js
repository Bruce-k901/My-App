// Debug script to check user authentication state
// Run this in the browser console while logged in

async function debugAuthState() {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.log('❌ No user logged in:', userError?.message);
    return;
  }
  
  console.log('✅ User logged in:', user.id, user.email);
  
  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (profileError || !profile) {
    console.log('❌ No profile found:', profileError?.message);
    console.log('🔧 This is why you\'re redirected to company setup');
    return;
  }
  
  console.log('✅ Profile found:', profile);
  
  // Check company
  if (profile.company_id) {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
      
    if (companyError || !company) {
      console.log('❌ No company found for company_id:', profile.company_id, companyError?.message);
      console.log('🔧 This is why you\'re redirected to company setup');
      return;
    }
    
    console.log('✅ Company found:', company);
    
    if (company.setup_status !== 'active') {
      console.log('⚠️ Company setup not complete. Status:', company.setup_status);
      console.log('🔧 This is why you\'re redirected to company setup');
    } else {
      console.log('✅ Company setup is complete. You should go to dashboard.');
    }
  } else {
    console.log('❌ No company_id in profile');
    console.log('🔧 This is why you\'re redirected to company setup');
  }
}

// Run the debug function
debugAuthState();