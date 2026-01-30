import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, app_role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const assignmentId = searchParams.get('assignment_id');
    const courseId = searchParams.get('course_id');
    const profileId = searchParams.get('profile_id');

    if (!assignmentId || !courseId || !profileId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Permission check: users can only view their own progress, or managers can view their company's progress
    if (profileId !== profile.id && profile.app_role !== 'admin' && profile.app_role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify assignment belongs to the profile
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('course_assignments')
      .select('id, profile_id, company_id')
      .eq('id', assignmentId)
      .eq('profile_id', profileId)
      .eq('course_id', courseId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Fetch progress
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('course_progress')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('course_id', courseId)
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false });

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    return NextResponse.json(progress || []);
  } catch (error) {
    console.error('Error in GET /api/training/progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      assignment_id,
      course_id,
      profile_id,
      company_id,
      module_id,
      lesson_id,
      page_id,
      module_index,
      page_index,
      status,
      quiz_score,
      quiz_passed,
      time_spent_seconds,
    } = body;

    // Validate required fields
    if (!assignment_id || !course_id || !profile_id || !company_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Permission check: users can only update their own progress
    if (profile_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify assignment belongs to the profile
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('course_assignments')
      .select('id, profile_id, company_id, status')
      .eq('id', assignment_id)
      .eq('profile_id', profile_id)
      .eq('course_id', course_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Update assignment status to 'in_progress' if it's 'confirmed'
    if (assignment.status === 'confirmed' && status === 'in_progress') {
      await supabaseAdmin
        .from('course_assignments')
        .update({ status: 'in_progress' })
        .eq('id', assignment_id);
    }

    // Prepare progress data
    // Note: The unique constraint uses COALESCE(lesson_id, '') and COALESCE(page_id, '')
    // So we need to use empty strings instead of null for consistency
    const progressData: any = {
      company_id: company_id,
      profile_id: profile_id,
      course_id: course_id,
      assignment_id: assignment_id,
      module_id: module_id || '',
      lesson_id: lesson_id || '',
      page_id: page_id || '',
      status: status || 'in_progress',
    };

    if (quiz_score !== undefined) {
      progressData.quiz_score = quiz_score;
      progressData.quiz_passed = quiz_passed || false;
    }

    if (time_spent_seconds !== undefined) {
      progressData.time_spent_seconds = time_spent_seconds;
    }

    if (status === 'in_progress' && !progressData.started_at) {
      progressData.started_at = new Date().toISOString();
    }

    if (status === 'completed') {
      progressData.completed_at = new Date().toISOString();
      if (!progressData.started_at) {
        progressData.started_at = new Date().toISOString();
      }
    }

    // Upsert progress
    // First, try to find existing progress record
    const { data: existing, error: findError } = await supabaseAdmin
      .from('course_progress')
      .select('id')
      .eq('profile_id', profile_id)
      .eq('course_id', course_id)
      .eq('module_id', progressData.module_id)
      .eq('lesson_id', progressData.lesson_id)
      .eq('page_id', progressData.page_id)
      .maybeSingle();

    let progress;
    let progressError;

    if (existing) {
      // Update existing record
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('course_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single();
      progress = updated;
      progressError = updateError;
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('course_progress')
        .insert(progressData)
        .select()
        .single();
      progress = inserted;
      progressError = insertError;
    }

    if (progressError) {
      console.error('Error upserting progress:', progressError);
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error in POST /api/training/progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
