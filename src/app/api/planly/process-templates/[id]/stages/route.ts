import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('planly_process_stages')
      .select(`
        *,
        equipment:planly_stage_equipment(*),
        bake_group:planly_bake_groups(*),
        destination_group:planly_destination_groups(*)
      `)
      .eq('template_id', id)
      .order('day_offset', { ascending: true })
      .order('sequence', { ascending: true });

    if (error) {
      console.error('Error fetching process stages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/process-templates/[id]/stages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('planly_process_stages')
      .insert({
        ...body,
        template_id: id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating process stage:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/process-templates/[id]/stages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Bulk update/sync stages - delete all and recreate to avoid sequence conflicts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: templateId } = await params;
    const body = await request.json();

    const { stages } = body as {
      stages: Array<{
        id?: string;
        name: string;
        sequence: number;
        day_offset: number;
        duration_hours?: number;
        is_overnight?: boolean;
        instructions?: string;
        bake_group_id?: string;
        destination_group_id?: string;
        bake_group_ids?: string[];
        destination_group_ids?: string[];
        time_constraint?: string;
        isNew?: boolean;
      }>;
      deletedStageIds?: string[];
    };

    // 1. Delete ALL existing stages for this template
    const { error: deleteError } = await supabase
      .from('planly_process_stages')
      .delete()
      .eq('template_id', templateId);

    if (deleteError) {
      console.error('Error deleting existing stages:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 2. Insert all stages fresh with correct sequences
    if (stages.length > 0) {
      const stagesToInsert = stages.map(stage => ({
        template_id: templateId,
        name: stage.name || `Step ${stage.sequence}`,
        sequence: stage.sequence,
        day_offset: stage.day_offset,
        duration_hours: stage.duration_hours,
        is_overnight: stage.is_overnight ?? false,
        instructions: stage.instructions || null,
        bake_group_id: stage.bake_group_id || null,
        destination_group_id: stage.destination_group_id || null,
        bake_group_ids: stage.bake_group_ids || [],
        destination_group_ids: stage.destination_group_ids || [],
        time_constraint: stage.time_constraint || null,
      }));

      const { data: created, error: insertError } = await supabase
        .from('planly_process_stages')
        .insert(stagesToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting stages:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, stages: created });
    }

    return NextResponse.json({ success: true, stages: [] });
  } catch (error) {
    console.error('Error in PUT /api/planly/process-templates/[id]/stages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
