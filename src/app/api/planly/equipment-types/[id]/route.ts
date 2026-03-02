import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('planly_equipment_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching equipment type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Equipment type not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/equipment-types/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('planly_equipment_types')
      .update({
        ...body,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating equipment type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PATCH /api/planly/equipment-types/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Check if any products are using this equipment type
    const { data: products, error: productsError } = await supabase
      .from('planly_products')
      .select('id')
      .eq('equipment_type_id', id)
      .limit(1);

    if (productsError) {
      console.error('Error checking products:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete equipment type that is assigned to products. Remove product assignments first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('planly_equipment_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting equipment type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/equipment-types/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
