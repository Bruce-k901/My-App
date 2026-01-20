import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';

/**
 * PATCH /api/stockly/customers/[id]/archive
 * Archive customer (disable portal access, preserve all historical data)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier found for this user' },
        { status: 404 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Verify ownership
    const { data: existing } = await supabase
      .from('order_book_customers')
      .select('id, supplier_id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Archive customer
    const updateData: any = {
      status: 'archived',
      archived_at: new Date().toISOString(),
      portal_access_enabled: false, // Disable portal access
    };

    // Store reason in internal_notes if provided
    if (body.reason) {
      const { data: current } = await supabase
        .from('order_book_customers')
        .select('internal_notes')
        .eq('id', id)
        .single();

      const existingNotes = current?.internal_notes || '';
      const archiveNote = `[Archived ${new Date().toLocaleDateString()}] ${body.reason}`;
      updateData.internal_notes = existingNotes
        ? `${existingNotes}\n\n${archiveNote}`
        : archiveNote;
    }

    const { data: customer, error: updateError } = await supabase
      .from('order_book_customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error archiving customer:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to archive customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer archived successfully',
      data: customer,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/stockly/customers/[id]/archive:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

