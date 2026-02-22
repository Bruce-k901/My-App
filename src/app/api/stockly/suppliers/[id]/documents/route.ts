// @salsa - SALSA Compliance: Supplier documents API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/suppliers/[id]/documents
 * List documents for a supplier.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('include_archived') === 'true';

    let query = supabase
      .from('supplier_documents')
      .select('*')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

/**
 * POST /api/stockly/suppliers/[id]/documents
 * Create a document record for a supplier.
 * Body: { company_id, document_type, name, description?, file_path, version?, expiry_date? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const { company_id, document_type, name, description, file_path, version, expiry_date } = body;

    if (!company_id || !document_type || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, document_type, name' },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Insert document record
    const { data, error } = await supabase
      .from('supplier_documents')
      .insert({
        company_id,
        supplier_id: id,
        document_type,
        name,
        description: description || null,
        file_path: file_path || null,
        version: version || 'v1',
        expiry_date: expiry_date || null,
        uploaded_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
