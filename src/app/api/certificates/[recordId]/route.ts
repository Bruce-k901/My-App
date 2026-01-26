import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generateCertificatePdf, CertificateData } from "@/lib/certificates/generateCertificatePdf";

export async function GET(
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // 1. Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch training record with all related data
  const { data: record, error: fetchError } = await supabase
    .from("training_records")
    .select(`
      id,
      certificate_number,
      completed_at,
      expiry_date,
      score_percentage,
      passed,
      profile:profiles!training_records_profile_id_fkey (
        id,
        full_name,
        company_id
      ),
      course:training_courses!training_records_course_id_fkey (
        id,
        name
      )
    `)
    .eq("id", params.recordId)
    .eq("passed", true)
    .single();

  if (fetchError || !record) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  // 3. Verify user has access (same company or is the certificate holder)
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!currentProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const isOwner = record.profile.id === currentProfile.id;
  const isSameCompany = record.profile.company_id === currentProfile.company_id;
  const isManagerOrAbove = ["owner", "admin", "manager", "regional_manager", "area_manager"].includes(currentProfile.role || "");

  if (!isOwner && !(isSameCompany && isManagerOrAbove)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // 4. Get site info from course_assignment
  const { data: assignment } = await supabase
    .from("course_assignments")
    .select(`
      confirmation_site_id,
      site:sites!course_assignments_confirmation_site_id_fkey (
        name
      )
    `)
    .eq("training_record_id", record.id)
    .single();

  // 5. Get company name
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", record.profile.company_id)
    .single();

  // 6. Check for cached PDF in Supabase Storage
  const storagePath = `certificates/${record.certificate_number}.pdf`;
  let existingFile: Blob | null = null;
  
  try {
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(storagePath);
    
    if (!fileError && fileData) {
      existingFile = fileData;
    }
  } catch (err) {
    // Storage bucket might not exist or file doesn't exist, continue to generate
    console.log("Certificate cache check:", err);
  }

  if (existingFile) {
    // Return cached PDF
    const arrayBuffer = await existingFile.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${record.certificate_number}.pdf"`,
        "Cache-Control": "private, max-age=31536000", // Cache for 1 year
      },
    });
  }

  // 7. Generate new PDF
  const certificateData: CertificateData = {
    candidate_name: record.profile.full_name || "Unknown",
    course_title: record.course.name || "Unknown Course",
    site_name: assignment?.site?.name || "N/A",
    company_name: company?.name || "N/A",
    completion_date: formatDate(record.completed_at),
    expiry_date: formatDate(record.expiry_date),
    certificate_number: record.certificate_number || "N/A",
    score_percentage: record.score_percentage || 0,
  };

  try {
    const pdfBytes = await generateCertificatePdf(certificateData);

    // 8. Cache PDF to Supabase Storage (non-blocking)
    supabase.storage
      .from("documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      })
      .catch((err) => console.error("Failed to cache certificate:", err));

    // 9. Update training record with certificate URL if not already set
    if (!record.certificate_url) {
      const publicUrl = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath).data.publicUrl;
      
      await supabase
        .from("training_records")
        .update({ certificate_url: publicUrl })
        .eq("id", record.id)
        .catch((err) => console.error("Failed to update certificate URL:", err));
    }

    // 10. Return PDF
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${record.certificate_number}.pdf"`,
        "Cache-Control": "private, max-age=31536000",
      },
    });
  } catch (error: any) {
    console.error("Error generating certificate:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Format date as "23 January 2026"
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
