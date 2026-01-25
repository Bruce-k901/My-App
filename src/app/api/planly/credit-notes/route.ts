import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const issueDate = searchParams.get('issueDate');

    let query = supabase
      .from('planly_credit_notes')
      .select(`
        *,
        customer:planly_customers(*),
        lines:planly_credit_note_lines(
          *,
          product:planly_products(*)
        )
      `)
      .order('issue_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (issueDate) {
      query = query.eq('issue_date', issueDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching credit notes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/credit-notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { lines, siteId, ...creditNoteData } = body;

    // Generate credit note number
    const { data: creditNumberData, error: numberError } = await supabase.rpc(
      'generate_credit_note_number',
      { p_site_id: siteId }
    );

    if (numberError) {
      console.error('Error generating credit note number:', numberError);
      return NextResponse.json(
        { error: 'Failed to generate credit note number' },
        { status: 500 }
      );
    }

    // Create credit note
    const { data: creditNote, error: creditNoteError } = await supabase
      .from('planly_credit_notes')
      .insert({
        ...creditNoteData,
        credit_number: creditNumberData,
      })
      .select()
      .single();

    if (creditNoteError) {
      console.error('Error creating credit note:', creditNoteError);
      return NextResponse.json({ error: creditNoteError.message }, { status: 500 });
    }

    // Create credit note lines if provided
    if (lines && lines.length > 0) {
      const creditLines = lines.map((line: any) => ({
        ...line,
        credit_note_id: creditNote.id,
      }));

      const { error: linesError } = await supabase
        .from('planly_credit_note_lines')
        .insert(creditLines);

      if (linesError) {
        console.error('Error creating credit note lines:', linesError);
        // Rollback credit note creation
        await supabase.from('planly_credit_notes').delete().eq('id', creditNote.id);
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }
    }

    // Fetch complete credit note
    const { data: completeCreditNote } = await supabase
      .from('planly_credit_notes')
      .select(`
        *,
        customer:planly_customers(*),
        lines:planly_credit_note_lines(
          *,
          product:planly_products(*)
        )
      `)
      .eq('id', creditNote.id)
      .single();

    return NextResponse.json(completeCreditNote || creditNote, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/credit-notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
