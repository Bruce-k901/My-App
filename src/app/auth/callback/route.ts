import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * Handle Supabase auth callback after email confirmation
 * Verifies the email confirmation token and completes signup
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get('next') || '/dashboard/business';
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  
  console.log('🔗 Auth callback called:', { token_hash: !!token_hash, type, next });
  
  const supabase = await createServerSupabaseClient();
  
  let verifiedUser = null;
  
  // Verify token_hash for all auth flows (email confirmation, invite, recovery, etc.)
  const verifiableTypes = ['email', 'invite', 'recovery', 'magiclink', 'signup', 'email_change'] as const;
  type VerifiableType = typeof verifiableTypes[number];

  if (token_hash && type && verifiableTypes.includes(type as VerifiableType)) {
    console.log(`🔐 Verifying ${type} token...`);
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      type: type as VerifiableType,
      token_hash,
    });

    if (verifyError || !verifyData.user) {
      console.error(`❌ ${type} verification failed:`, verifyError);
      return NextResponse.redirect(new URL(`/login?error=verification_failed`, request.url));
    }

    verifiedUser = verifyData.user;
    console.log(`✅ ${type} verified, user:`, verifiedUser.id);

    // For invite/recovery flows, redirect immediately with session tokens in hash
    // so the client-side Supabase client can establish the correct session
    // (the server-side session lives in cookies, but the client reads from localStorage)
    if ((type === 'invite' || type === 'recovery') && verifyData.session) {
      const redirectUrl = new URL(next, request.url);
      redirectUrl.hash = `access_token=${verifyData.session.access_token}&refresh_token=${verifyData.session.refresh_token}`;
      console.log(`🚀 ${type} flow — redirecting to ${next} with session tokens`);
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // Get the current user (either from verified token or existing session)
  // Use getSession first to avoid 403 errors, then getUser if needed
  let user = verifiedUser;
  
  if (!user) {
    // Try to get user from session
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user;
  }
  
  // If still no user, try getUser (but handle 403 gracefully)
  if (!user) {
    const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser();
    if (userError && userError.message?.includes('403')) {
      // 403 means not authenticated - this can happen during email confirmation
      // Wait a moment and try session again
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: { session: retrySession } } = await supabase.auth.getSession();
      user = retrySession?.user;
    } else {
      user = fetchedUser;
    }
  }

  if (!user) {
    console.error('❌ No user found after verification');
    // No user - redirect to login
    return NextResponse.redirect(new URL(`/login?error=email_verification_failed`, request.url));
  }

  console.log('👤 User found:', user.id, user.email);

  // User is confirmed - complete the signup
  const userMetadata = user.user_metadata || {};
  const companyName = userMetadata.company_name || 'My Company';
  const appRole = userMetadata.app_role || 'Owner';

  console.log('🏢 Completing signup:', { companyName, appRole, userId: user.id });

  // Use admin client for all database operations (bypasses RLS)
  // This is necessary because the user might not have RLS permissions yet
  const { getSupabaseAdmin } = await import('@/lib/supabaseAdmin');
  const supabaseAdmin = getSupabaseAdmin();

  // Check if company already exists for this user (check multiple fields)
  const { data: existingCompany } = await supabaseAdmin
    .from('companies')
    .select('id, name')
    .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  let companyId = existingCompany?.id;

  if (!existingCompany) {
    console.log('🔄 Creating company for new user with name:', companyName);
    
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        industry: 'Hospitality',
        created_by: user.id,
        user_id: user.id,
        contact_email: user.email,
      })
      .select('id')
      .single();

    if (companyError || !companyData) {
      console.error('❌ Company creation failed:', companyError);
      // Even if company creation fails, continue - user can create it manually
      // But log the error for debugging
    } else {
      companyId = companyData.id;
      console.log('✅ Company created:', companyData.id, 'with name:', companyName);
      
      // Create or update profile to link to company
      // Use upsert to create if it doesn't exist, update if it does
      const fullName = userMetadata.full_name || `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim() || user.email;
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: user.id,
          company_id: companyData.id,
          app_role: appRole,
          email: user.email,
          full_name: fullName,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('⚠️ Profile upsert error (non-fatal):', profileError);
      } else {
        console.log('✅ Profile created/updated with company_id:', companyData.id);
      }

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          company_id: companyData.id,
          company_name: companyName,
        },
      });

      if (metadataError) {
        console.error('⚠️ Metadata update error (non-fatal):', metadataError);
      } else {
        console.log('✅ User metadata updated with company info');
      }

      // Create trial subscription
      try {
        const { createTrialSubscription } = await import('@/lib/subscriptions');
        await createTrialSubscription(companyData.id, 'starter');
        console.log('✅ Trial subscription created');
      } catch (subError) {
        console.error('⚠️ Trial subscription creation failed (non-fatal):', subError);
      }
    }
  } else {
    console.log('ℹ️ Company already exists:', existingCompany.id, 'with name:', existingCompany.name);
    companyId = existingCompany.id;
    
    // Even if company exists, ensure profile exists and is linked
    const fullName = userMetadata.full_name || `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim() || user.email;
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        company_id: companyId,
        app_role: appRole,
        email: user.email,
        full_name: fullName,
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error('⚠️ Profile upsert error (non-fatal):', profileError);
    } else {
      console.log('✅ Profile ensured with company_id:', companyId);
    }
  }

  console.log('🚀 Redirecting to:', next);
  // Redirect to business details page (or specified next URL)
  return NextResponse.redirect(new URL(next, request.url));
}

