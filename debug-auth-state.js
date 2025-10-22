// Debug script to check authentication state and company setup status
// Run this in the browser console on your app

async function debugAuthState() {
  console.log('🔍 Debugging Authentication State...\n');
  
  try {
    // Check Supabase client
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase client not found. Make sure you\'re on a page with Supabase loaded.');
      return;
    }

    // 1. Check current session
    console.log('1️⃣ Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('❌ No active session found');
      return;
    }
    
    console.log('✅ Session found:', {
      userId: session.user.id,
      email: session.user.email,
      expiresAt: new Date(session.expires_at * 1000).toLocaleString()
    });

    // 2. Check user profile
    console.log('\n2️⃣ Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return;
    }
    
    if (!profile) {
      console.log('❌ No profile found for user');
      return;
    }
    
    console.log('✅ Profile found:', profile);

    // 3. Check company data
    console.log('\n3️⃣ Checking company data...');
    if (!profile.company_id) {
      console.log('❌ No company_id in profile');
      return;
    }
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
    
    if (companyError) {
      console.error('❌ Company error:', companyError);
      return;
    }
    
    if (!company) {
      console.log('❌ No company found');
      return;
    }
    
    console.log('✅ Company found:', {
      id: company.id,
      name: company.name,
      setup_status: company.setup_status,
      active: company.active,
      created_at: company.created_at
    });

    // 4. Analyze redirect logic
    console.log('\n4️⃣ Analyzing redirect logic...');
    
    if (!profile || !company) {
      console.log('🔄 Would redirect to: /setup/company (missing profile or company)');
      return;
    }
    
    if (company.setup_status !== 'active') {
      const setupStatusMap = {
        'new': '/setup/sites',
        'sites_added': '/setup/team',
        'team_added': '/setup/checklists',
        'checklists_added': '/setup/equipment',
        'equipment_added': '/setup/summary'
      };
      
      const nextRoute = setupStatusMap[company.setup_status] || '/setup/sites';
      console.log(`🔄 Would redirect to: ${nextRoute} (setup_status: ${company.setup_status})`);
    } else {
      console.log('✅ Would redirect to: /dashboard (setup complete)');
    }

    // 5. Check sites count
    console.log('\n5️⃣ Checking sites...');
    const { count: sitesCount, error: sitesError } = await supabase
      .from('sites')
      .select('id', { count: 'exact' })
      .eq('company_id', profile.company_id);
    
    if (sitesError) {
      console.error('❌ Sites count error:', sitesError);
    } else {
      console.log(`✅ Sites count: ${sitesCount}`);
    }

    // 6. Summary
    console.log('\n📋 SUMMARY:');
    console.log('Session:', session ? '✅ Valid' : '❌ Invalid');
    console.log('Profile:', profile ? '✅ Found' : '❌ Missing');
    console.log('Company:', company ? '✅ Found' : '❌ Missing');
    console.log('Setup Status:', company?.setup_status || 'Unknown');
    console.log('Sites Count:', sitesCount || 0);
    
    const isSetupComplete = company?.setup_status === 'active';
    console.log('Setup Complete:', isSetupComplete ? '✅ Yes' : '❌ No');
    
    if (!isSetupComplete) {
      console.log('\n🚨 ISSUE IDENTIFIED:');
      console.log('The company setup is not complete. This causes redirects to setup pages.');
      console.log('Current setup_status:', company?.setup_status);
      console.log('Expected setup_status: "active"');
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug function
debugAuthState();