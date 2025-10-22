// Script to fix JWT metadata for authentication
// Run this in the browser console while logged in

async function fixJWTMetadata() {
  try {
    console.log('🔧 Starting JWT metadata fix...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No user logged in:', userError?.message);
      return;
    }
    
    console.log('✅ User logged in:', user.id, user.email);
    
    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.error('❌ Profile not found:', profileError);
      return;
    }
    
    console.log('✅ Profile found:', {
      id: profile.id,
      email: profile.email,
      role: profile.app_role,
      company_id: profile.company_id,
      site_id: profile.site_id
    });
    
    // Update user metadata using Supabase Admin API
    // Note: This requires admin privileges or a server-side function
    console.log('🔧 Updating JWT metadata...');
    
    // For now, let's try to refresh the session to pick up profile data
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('❌ Session refresh failed:', refreshError);
    } else {
      console.log('✅ Session refreshed successfully');
    }
    
    // Sign out and back in to force metadata update
    console.log('🔄 Signing out and back in to refresh metadata...');
    
    // Store current URL to redirect back
    const currentUrl = window.location.href;
    
    await supabase.auth.signOut();
    
    console.log('✅ Signed out. Please sign back in.');
    console.log('📍 You were at:', currentUrl);
    
    // Redirect to login
    window.location.href = '/login';
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixJWTMetadata();