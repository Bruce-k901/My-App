import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const VALID_ROLES = ['Admin', 'Manager', 'Staff', 'Owner', 'General Manager'];

export async function POST(request: Request) {
  try {
    // Auth check — platform admin only
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const { data: profile } = await admin
      .from('profiles')
      .select('id, is_platform_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile?.is_platform_admin) {
      return NextResponse.json({ error: 'Forbidden: Platform admin access required' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const { email, fullName, appRole, temporaryPassword, companyId } = body;

    if (!email || !fullName || !appRole || !temporaryPassword || !companyId) {
      return NextResponse.json({ error: 'Missing required fields: email, fullName, appRole, temporaryPassword, companyId' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(appRole)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    if (temporaryPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Verify company exists
    const { data: company } = await admin
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check for existing profile in same company
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, company_id')
      .eq('email', emailLower)
      .eq('company_id', companyId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: 'User already belongs to this company' }, { status: 409 });
    }

    // Create auth user with email auto-confirmed
    let authUserId: string;

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailLower,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, company_id: companyId },
    });

    if (authError) {
      if (/already.*registered|already exists/i.test(authError.message || '')) {
        // User exists — find them and update password + confirm
        const { data: { users } } = await admin.auth.admin.listUsers();
        const existing = users.find(u => u.email?.toLowerCase() === emailLower);
        if (!existing) {
          return NextResponse.json({ error: 'User exists but could not be found' }, { status: 400 });
        }
        await admin.auth.admin.updateUserById(existing.id, {
          password: temporaryPassword,
          email_confirm: true,
        });
        authUserId = existing.id;
        console.log('✅ Existing auth user updated and confirmed:', authUserId);
      } else {
        console.error('❌ Auth user creation failed:', authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      authUserId = authData.user.id;
      console.log('✅ Auth user created:', authUserId);
    }

    // Create or update profile
    const { data: profileByAuth } = await admin
      .from('profiles')
      .select('id, company_id')
      .eq('id', authUserId)
      .maybeSingle();

    if (profileByAuth) {
      // Update existing profile
      await admin
        .from('profiles')
        .update({
          company_id: companyId,
          app_role: appRole,
          full_name: fullName,
          email: emailLower,
          auth_user_id: authUserId,
        })
        .eq('id', authUserId);
    } else {
      // Create new profile
      await admin
        .from('profiles')
        .insert({
          id: authUserId,
          auth_user_id: authUserId,
          email: emailLower,
          full_name: fullName,
          company_id: companyId,
          app_role: appRole,
        });
    }

    // Create user_companies entry
    await admin
      .from('user_companies')
      .upsert({
        profile_id: authUserId,
        company_id: companyId,
        app_role: appRole,
        is_primary: true,
      }, { onConflict: 'profile_id,company_id' });

    console.log('✅ User added to company via admin:', { email: emailLower, companyId, role: appRole });

    return NextResponse.json({
      success: true,
      email: emailLower,
      profileId: authUserId,
    });
  } catch (e: any) {
    console.error('❌ Admin user creation error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
