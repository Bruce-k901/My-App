import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { count, error } = await supabase
      .from('planly_products')
      .select('id', { count: 'exact', head: true })
      .eq('processing_group_id', id);

    if (error) {
      console.error('Error checking linked products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in GET /api/planly/processing-groups/[id]/linked-products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
