import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; stageId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { stageId } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('planly_process_stages')
      .update(body)
      .eq('id', stageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating process stage:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/planly/process-templates/[id]/stages/[stageId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; stageId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { stageId } = params;

    const { error } = await supabase
      .from('planly_process_stages')
      .delete()
      .eq('id', stageId);

    if (error) {
      console.error('Error deleting process stage:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/process-templates/[id]/stages/[stageId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
