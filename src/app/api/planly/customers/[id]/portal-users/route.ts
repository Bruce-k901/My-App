import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// GET - List portal users for a customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: customerId } = await params;

    const { data, error } = await supabase
      .from('planly_customer_portal_users')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching portal users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/customers/[id]/portal-users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add portal user(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: customerId } = await params;
    const body = await request.json();

    // Support single user or array
    const users = Array.isArray(body) ? body : [body];

    const usersToInsert = users.map(user => ({
      customer_id: customerId,
      name: user.name,
      email: user.email.toLowerCase(),
      phone: user.phone || null,
      is_primary: user.is_primary || false,
    }));

    const { data, error } = await supabase
      .from('planly_customer_portal_users')
      .insert(usersToInsert)
      .select();

    if (error) {
      console.error('Error creating portal users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/customers/[id]/portal-users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
