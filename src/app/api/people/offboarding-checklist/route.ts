import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/people/offboarding-checklist?profileId=xxx
 * Fetch checklist items for an employee
 */
export async function GET(req: NextRequest) {
  try {
    const profileId = req.nextUrl.searchParams.get('profileId');
    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('offboarding_checklist_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[offboarding-checklist GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[offboarding-checklist GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/people/offboarding-checklist
 * Toggle checklist item completion
 * Body: { itemId, isCompleted, completedBy }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { itemId, isCompleted, completedBy } = await req.json();
    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const updateData: Record<string, any> = {
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted) {
      updateData.completed_by = completedBy || null;
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_by = null;
      updateData.completed_at = null;
    }

    const { data, error } = await admin
      .from('offboarding_checklist_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('[offboarding-checklist PATCH]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[offboarding-checklist PATCH]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * POST /api/people/offboarding-checklist
 * Add a custom checklist item
 * Body: { profileId, companyId, title, category, description?, isRequired? }
 */
export async function POST(req: NextRequest) {
  try {
    const { profileId, companyId, title, category, description, isRequired } = await req.json();
    if (!profileId || !companyId || !title || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Get max sort_order for this profile
    const { data: existing } = await admin
      .from('offboarding_checklist_items')
      .select('sort_order')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (existing?.sort_order ?? 0) + 1;

    const { data, error } = await admin
      .from('offboarding_checklist_items')
      .insert({
        profile_id: profileId,
        company_id: companyId,
        title,
        category,
        description: description || null,
        is_required: isRequired ?? false,
        sort_order: nextOrder,
        auto_generated: false,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[offboarding-checklist POST]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[offboarding-checklist POST]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/people/offboarding-checklist
 * Remove a custom (non-auto-generated) checklist item
 * Body: { itemId }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { itemId } = await req.json();
    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Only allow deleting custom (non-auto-generated) items
    const { data: item } = await admin
      .from('offboarding_checklist_items')
      .select('auto_generated')
      .eq('id', itemId)
      .single();

    if (item?.auto_generated) {
      return NextResponse.json(
        { error: 'Cannot delete auto-generated checklist items' },
        { status: 403 },
      );
    }

    const { error } = await admin
      .from('offboarding_checklist_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[offboarding-checklist DELETE]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[offboarding-checklist DELETE]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
