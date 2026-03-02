import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { completeOnboarding } from '@/lib/services/onboarding';

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
    const { companyName, industry, ownerEmail, ownerFullName, temporaryPassword } = body;

    if (!companyName || !ownerEmail || !ownerFullName || !temporaryPassword) {
      return NextResponse.json({ error: 'Missing required fields: companyName, ownerEmail, ownerFullName, temporaryPassword' }, { status: 400 });
    }

    if (temporaryPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const emailLower = ownerEmail.toLowerCase().trim();

    // Check for duplicate company name
    const { data: existingCompany } = await admin
      .from('companies')
      .select('id')
      .ilike('name', companyName.trim())
      .maybeSingle();

    if (existingCompany) {
      return NextResponse.json({ error: `A company named "${companyName.trim()}" already exists` }, { status: 409 });
    }

    // Create auth user with email auto-confirmed
    let authUserId: string;

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailLower,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: ownerFullName },
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

    // Split name for onboarding service
    const [firstName, ...lastParts] = ownerFullName.trim().split(' ');
    const lastName = lastParts.join(' ') || firstName;

    // Use existing onboarding service for atomic company + profile + subscription creation
    const result = await completeOnboarding({
      userId: authUserId,
      email: emailLower,
      firstName,
      lastName,
      companyName: companyName.trim(),
      industry: industry || undefined,
      contactEmail: emailLower,
    });

    if (!result.success) {
      console.error('❌ Onboarding failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Ensure auth_user_id is set on the profile
    await admin
      .from('profiles')
      .update({ auth_user_id: authUserId })
      .eq('id', authUserId);

    console.log('✅ Company created via admin:', { companyId: result.companyId, email: emailLower });

    return NextResponse.json({
      success: true,
      companyId: result.companyId,
      profileId: result.profileId,
      email: emailLower,
    });
  } catch (e: any) {
    console.error('❌ Admin company creation error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
