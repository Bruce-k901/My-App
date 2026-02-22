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

/**
 * GET /api/training/questions
 * 
 * Query params:
 * - course_id: UUID of the training course
 * - module_id: Module ID (e.g., 'm1', 'final')
 * - count: Number of questions to return (optional, returns all if not specified)
 * - randomize: Boolean to randomize order (default: true)
 */
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

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('course_id');
    const moduleId = searchParams.get('module_id');
    const count = searchParams.get('count') ? parseInt(searchParams.get('count')!, 10) : null;
    const randomize = searchParams.get('randomize') !== 'false';

    if (!courseId || !moduleId) {
      return NextResponse.json({ error: 'Missing required parameters: course_id, module_id' }, { status: 400 });
    }

    // Fetch questions from database
    let query = supabaseAdmin
      .from('course_questions')
      .select(`
        id,
        question_text,
        question_type,
        explanation,
        difficulty,
        points,
        course_question_options (
          id,
          option_text,
          is_correct,
          sort_order
        )
      `)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Filter by company if needed (system defaults are available to all)
    // For now, we'll get all active questions (system defaults + company-specific)

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    // Transform database questions to Page format
    const transformedQuestions = questions.map((q: any) => {
      const options = (q.course_question_options || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((opt: any) => opt.option_text);

      // Find correct answer indices
      const correctOptions = (q.course_question_options || [])
        .map((opt: any, idx: number) => opt.is_correct ? idx : null)
        .filter((idx: number | null) => idx !== null) as number[];

      if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
        // Single choice question
        return {
          id: q.id,
          type: 'single_choice' as const,
          stem: q.question_text,
          options: options,
          answer: correctOptions[0] ?? 0,
          rationale: q.explanation || undefined,
        };
      } else if (q.question_type === 'multi_select') {
        // Multi choice question
        return {
          id: q.id,
          type: 'multi_choice' as const,
          stem: q.question_text,
          options: options,
          answers: correctOptions.length > 0 ? correctOptions : [0],
          rationale: q.explanation || undefined,
        };
      } else {
        // Unknown type, default to single choice
        return {
          id: q.id,
          type: 'single_choice' as const,
          stem: q.question_text,
          options: options,
          answer: correctOptions[0] ?? 0,
          rationale: q.explanation || undefined,
        };
      }
    });

    // Randomize if requested
    let finalQuestions = randomize
      ? transformedQuestions.sort(() => Math.random() - 0.5)
      : transformedQuestions;

    // Limit count if specified
    if (count && count > 0) {
      finalQuestions = finalQuestions.slice(0, count);
    }

    return NextResponse.json({ questions: finalQuestions });
  } catch (error) {
    console.error('Error in GET /api/training/questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
