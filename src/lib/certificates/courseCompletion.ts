/**
 * Course Completion Helper
 * 
 * Handles course completion and creates training records with certificate generation.
 * This ensures that when courses are completed, training logs are updated.
 */

import { createClient } from "@supabase/supabase-js";
import { getCourseMapping, courseGeneratesCertificate } from "./courseMapping";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Generate a certificate number for a training record
 */
function generateCertificateNumber(courseCode: string, year: number, randomSuffix: string): string {
  return `${courseCode}-${year}-${randomSuffix}`;
}

/**
 * Complete a course and create/update training record
 * 
 * @param profileId - The user's profile ID
 * @param courseId - The course ID from the course JSON file (e.g., "uk-l2-food-safety")
 * @param scorePercentage - The score percentage (0-100)
 * @param assignmentId - Optional course assignment ID
 * @param siteId - Optional site ID for the certificate
 */
export async function completeCourseWithCertificate(
  profileId: string,
  courseId: string,
  scorePercentage: number,
  assignmentId?: string,
  siteId?: string
): Promise<{ trainingRecordId: string; certificateNumber: string | null }> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Get course mapping
  const courseMapping = getCourseMapping(courseId);
  if (!courseMapping) {
    throw new Error(`Course mapping not found for course ID: ${courseId}`);
  }

  // 2. Find the training course in the database by name or code
  let trainingCourse;
  if (courseMapping.courseCode) {
    const { data: courseByCode } = await supabaseAdmin
      .from("training_courses")
      .select("id, name, code, certification_validity_months, pass_mark_percentage")
      .eq("code", courseMapping.courseCode)
      .maybeSingle();
    
    if (courseByCode) {
      trainingCourse = courseByCode;
    }
  }

  if (!trainingCourse) {
    const { data: courseByName } = await supabaseAdmin
      .from("training_courses")
      .select("id, name, code, certification_validity_months, pass_mark_percentage")
      .eq("name", courseMapping.courseName)
      .maybeSingle();
    
    if (courseByName) {
      trainingCourse = courseByName;
    }
  }

  if (!trainingCourse) {
    throw new Error(
      `Training course not found in database. Please ensure a course with name "${courseMapping.courseName}" or code "${courseMapping.courseCode}" exists in the training_courses table.`
    );
  }

  // 3. Get profile to get company_id
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id")
    .eq("id", profileId)
    .single();

  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // 4. Check if passed
  const passMark = trainingCourse.pass_mark_percentage || 70;
  const passed = scorePercentage >= passMark;

  if (!passed) {
    throw new Error(`Course not passed. Score: ${scorePercentage}%, Required: ${passMark}%`);
  }

  // 5. Generate certificate number if course generates certificates
  let certificateNumber: string | null = null;
  if (courseGeneratesCertificate(courseId) && passed) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    certificateNumber = generateCertificateNumber(
      courseMapping.courseCode || "CERT",
      year,
      randomSuffix
    );
  }

  // 6. Calculate expiry date
  const completedAt = new Date().toISOString();
  let expiryDate: string | null = null;
  if (trainingCourse.certification_validity_months) {
    const expiry = new Date(completedAt);
    expiry.setMonth(expiry.getMonth() + trainingCourse.certification_validity_months);
    expiryDate = expiry.toISOString().split("T")[0];
  }

  // 7. Create or update training record using the complete_training function
  const { data: recordId, error: rpcError } = await supabaseAdmin.rpc("complete_training", {
    p_profile_id: profileId,
    p_course_id: trainingCourse.id,
    p_completed_at: completedAt,
    p_score: scorePercentage,
    p_certificate_number: certificateNumber,
    p_expiry_date: expiryDate,
    p_recorded_by: profileId,
  });

  if (rpcError) {
    throw new Error(`Failed to create training record: ${rpcError.message}`);
  }

  if (!recordId) {
    throw new Error("Failed to create training record: No record ID returned");
  }

  // 8. Update course assignment if provided
  if (assignmentId) {
    await supabaseAdmin
      .from("course_assignments")
      .update({
        status: "completed",
        training_record_id: recordId,
        completed_at: completedAt,
      })
      .eq("id", assignmentId)
      .catch((err) => console.error("Failed to update course assignment:", err));
  }

  // 9. Get profile details for course charge
  const { data: profileDetails } = await supabaseAdmin
    .from("profiles")
    .select("full_name, first_name, last_name")
    .eq("id", profileId)
    .single();

  const candidateName = profileDetails?.full_name || 
    [profileDetails?.first_name, profileDetails?.last_name].filter(Boolean).join(" ") || 
    "Unknown";

  // 10. Create course charge (£5.00 = 500 pence)
  try {
    const { error: chargeError } = await supabaseAdmin
      .from("course_charges")
      .insert({
        company_id: profile.company_id,
        site_id: siteId || null,
        profile_id: profileId,
        course_id: trainingCourse.id,
        training_record_id: recordId,
        amount_pence: 500, // £5.00
        currency: "GBP",
        candidate_name: candidateName,
        course_name: trainingCourse.name,
        completion_date: completedAt.split("T")[0], // Date only
        status: "pending",
      });

    if (chargeError) {
      console.error("Failed to create course charge:", chargeError);
      // Don't throw - course completion should still succeed even if billing fails
    }
  } catch (error) {
    console.error("Error creating course charge:", error);
    // Don't throw - course completion should still succeed even if billing fails
  }

  return {
    trainingRecordId: recordId,
    certificateNumber,
  };
}

/**
 * Check if a course completion should generate a certificate
 */
export function shouldGenerateCertificate(courseId: string, scorePercentage: number): boolean {
  if (!courseGeneratesCertificate(courseId)) {
    return false;
  }
  // Default pass mark is 70%, but this should ideally come from the database
  return scorePercentage >= 70;
}
