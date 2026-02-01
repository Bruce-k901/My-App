import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST /api/training/records/[id]/update-expiry
 * Update the expiry date of a training record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  console.log('🚀 [UPDATE EXPIRY API] Route hit');
  try {
    // Handle both Promise and direct params (for Next.js version compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const recordId = resolvedParams.id;
    
    console.log('📋 [UPDATE EXPIRY API] Record ID:', recordId);
    
    if (!recordId) {
      console.error('❌ [UPDATE EXPIRY API] No record ID provided');
      return NextResponse.json({ error: 'Missing record ID' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const supabaseAdmin = getSupabaseAdmin();
    console.log('✅ [UPDATE EXPIRY API] Supabase clients created');

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ [UPDATE EXPIRY API] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized', details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.error('❌ [UPDATE EXPIRY API] No user found');
      return NextResponse.json({ error: 'Unauthorized', details: 'No user found' }, { status: 401 });
    }

    console.log('✅ [UPDATE EXPIRY API] User authenticated:', user.id);

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, app_role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [UPDATE EXPIRY API] Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('✅ [UPDATE EXPIRY API] Profile found:', { profileId: profile.id, companyId: profile.company_id });

    // Check permissions (manager/admin only)
    const isManager = ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager']
      .includes((profile.app_role || '').toLowerCase());

    if (!isManager) {
      console.error('❌ [UPDATE EXPIRY API] Insufficient permissions:', profile.app_role);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const body = await request.json();
    const { expiry_date, profile_id, certificate_type } = body;

    console.log('📥 [UPDATE EXPIRY API] Request received:', {
      recordId,
      expiry_date,
      profile_id,
      certificate_type,
      userCompanyId: profile.company_id
    });

    if (!expiry_date) {
      return NextResponse.json({ error: 'Missing required field: expiry_date' }, { status: 400 });
    }

    // Validate date format
    const expiryDate = new Date(expiry_date);
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Check if this is a legacy record (starts with "legacy-")
    if (recordId.startsWith('legacy-') && profile_id && certificate_type) {
      console.log('🔄 [UPDATE EXPIRY API] Processing legacy record update');
      
      // Update legacy profiles table field
      const profileFieldMap: Record<string, string> = {
        'food_safety': 'food_safety_expiry_date',
        'h_and_s': 'h_and_s_expiry_date',
        'fire_marshal': 'fire_marshal_expiry_date',
        'first_aid': 'first_aid_expiry_date',
        'cossh': 'cossh_expiry_date',
      };
      
      const fieldName = profileFieldMap[certificate_type.toLowerCase()];
      if (!fieldName) {
        console.error('❌ [UPDATE EXPIRY API] Invalid certificate type:', certificate_type);
        return NextResponse.json({ 
          error: 'Invalid certificate type', 
          details: `Certificate type '${certificate_type}' is not supported` 
        }, { status: 400 });
      }

      console.log('🔍 [UPDATE EXPIRY API] Verifying profile:', { profile_id, fieldName });

      // Verify profile belongs to company
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, company_id')
        .eq('id', profile_id)
        .single();

      if (profileError) {
        console.error('❌ [UPDATE EXPIRY API] Profile query error:', profileError);
        return NextResponse.json({ 
          error: 'Profile not found', 
          details: profileError.message 
        }, { status: 404 });
      }

      if (!profileData) {
        console.error('❌ [UPDATE EXPIRY API] Profile not found:', profile_id);
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      console.log('✅ [UPDATE EXPIRY API] Profile found:', {
        profileId: profileData.id,
        profileCompanyId: profileData.company_id,
        userCompanyId: profile.company_id
      });

      if (profileData.company_id !== profile.company_id) {
        console.error('❌ [UPDATE EXPIRY API] Company mismatch');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      console.log('💾 [UPDATE EXPIRY API] Updating legacy field:', {
        profile_id,
        fieldName,
        expiryDate: expiryDate.toISOString().split('T')[0]
      });

      // Update the legacy field
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          [fieldName]: expiryDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile_id);

      if (updateError) {
        console.error('❌ [UPDATE EXPIRY API] Update error:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        return NextResponse.json({ 
          error: 'Failed to update expiry date',
          details: updateError.message || 'Database update failed'
        }, { status: 500 });
      }

      console.log('✅ [UPDATE EXPIRY API] Legacy field updated successfully');
      return NextResponse.json({
        success: true,
        recordId: recordId,
        newExpiryDate: expiryDate.toISOString().split('T')[0],
        updatedLegacyField: true,
      });
    }

    // Regular training_records update
    // Get the training record to verify it exists and belongs to the company
    const { data: record, error: recordError } = await supabaseAdmin
      .from('training_records')
      .select('id, company_id, profile_id, course_id, expiry_date')
      .eq('id', recordId)
      .single();

    if (recordError || !record) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
    }

    // Verify company access
    if (record.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the expiry date
    const { error: updateError } = await supabaseAdmin
      .from('training_records')
      .update({
        expiry_date: expiryDate.toISOString().split('T')[0], // Date only
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (updateError) {
      console.error('Error updating training record expiry:', updateError);
      return NextResponse.json({ error: 'Failed to update expiry date' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recordId: record.id,
      newExpiryDate: expiryDate.toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('❌ [UPDATE EXPIRY API] Unexpected error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error?.message || 'An unexpected error occurred',
      type: error?.name || 'UnknownError'
    }, { status: 500 });
  }
}
