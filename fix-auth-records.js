// Script to create missing profile and company records
// Run this in the browser console while logged in

async function fixAuthRecords() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No user logged in:', userError?.message);
      return;
    }
    
    console.log('✅ User logged in:', user.id, user.email);
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    let companyId;
    
    if (!existingProfile) {
      console.log('🔧 Creating missing profile...');
      
      // First, create a company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: 'My Company',
          legal_name: 'My Company Ltd',
          country: 'United Kingdom',
          industry: 'Technology',
          contact_email: user.email,
          setup_status: 'active',
          user_id: user.id
        })
        .select()
        .single();
      
      if (companyError) {
        console.error('❌ Error creating company:', companyError);
        return;
      }
      
      companyId = newCompany.id;
      console.log('✅ Company created:', companyId);
      
      // Then create the profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'User',
          company_id: companyId,
          role: 'admin',
          position_title: 'Administrator'
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        return;
      }
      
      console.log('✅ Profile created:', newProfile);
    } else {
      console.log('✅ Profile exists:', existingProfile);
      companyId = existingProfile.company_id;
      
      // Check if company exists and is active
      if (companyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();
        
        if (!company) {
          console.log('🔧 Company missing, creating...');
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert({
              id: companyId,
              name: 'My Company',
              legal_name: 'My Company Ltd',
              country: 'United Kingdom',
              industry: 'Technology',
              contact_email: user.email,
              setup_status: 'active',
              user_id: user.id
            })
            .select()
            .single();
          
          if (companyError) {
            console.error('❌ Error creating company:', companyError);
            return;
          }
          console.log('✅ Company created:', newCompany);
        } else if (company.setup_status !== 'active') {
          console.log('🔧 Updating company setup status to active...');
          const { error: updateError } = await supabase
            .from('companies')
            .update({ setup_status: 'active' })
            .eq('id', companyId);
          
          if (updateError) {
            console.error('❌ Error updating company:', updateError);
            return;
          }
          console.log('✅ Company setup status updated to active');
        }
      }
    }
    
    console.log('🎉 All records fixed! You should now be able to access the dashboard.');
    console.log('🔄 Refresh the page or try logging in again.');
    
  } catch (error) {
    console.error('❌ Error fixing auth records:', error);
  }
}

// Run the fix function
fixAuthRecords();