import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update portal user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: customerId, userId } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('planly_customer_portal_users')
      .update({
        name: body.name,
        email: body.email?.toLowerCase(),
        phone: body.phone,
        is_primary: body.is_primary,
        is_active: body.is_active,
      })
      .eq('id', userId)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating portal user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/planly/customers/[id]/portal-users/[userId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove portal user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: customerId, userId } = await params;

    // Check if user has active auth account
    const { data: user } = await supabase
      .from('planly_customer_portal_users')
      .select('auth_user_id')
      .eq('id', userId)
      .single();

    if (user?.auth_user_id) {
      return NextResponse.json(
        { error: 'Cannot delete user with active account' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('planly_customer_portal_users')
      .delete()
      .eq('id', userId)
      .eq('customer_id', customerId);

    if (error) {
      console.error('Error deleting portal user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/customers/[id]/portal-users/[userId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
