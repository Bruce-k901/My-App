import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { completeCourseWithCertificate } from "@/lib/certificates/courseCompletion";

/**
 * API endpoint to complete a course and create training record
 *
 * POST /api/courses/complete
 * Body: {
 *   courseId: string,        // Course ID from JSON file (e.g., "uk-l2-food-safety")
 *   scorePercentage: number,  // Score 0-100
 *   assignmentId?: string,    // Optional course assignment ID
 *   siteId?: string          // Optional site ID
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  // 1. Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // 3. Parse request body
  const body = await request.json();
  const { courseId, scorePercentage, assignmentId, siteId } = body;

  if (!courseId || scorePercentage === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: courseId, scorePercentage" },
      { status: 400 }
    );
  }

  // 4. Complete course and create training record
  try {
    const result = await completeCourseWithCertificate(
      profile.id,
      courseId,
      scorePercentage,
      assignmentId,
      siteId
    );

    return NextResponse.json({
      success: true,
      trainingRecordId: result.trainingRecordId,
      certificateNumber: result.certificateNumber,
      certificateUrl: result.certificateNumber
        ? `/api/certificates/${result.trainingRecordId}`
        : null,
    });
  } catch (error: any) {
    console.error("Error completing course:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete course" },
      { status: 500 }
    );
  }
}
