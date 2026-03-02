import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateCertificatePdf, CertificateData } from "@/lib/certificates/generateCertificatePdf";

// Module-level cache so the template is only read once per cold start
let cachedTemplate: Buffer | null = null;

async function getTemplateBytes(): Promise<Buffer> {
  if (cachedTemplate) return cachedTemplate;
  const templatePath = path.join(
    process.cwd(),
    "public",
    "courses",
    "Training Certificate",
    "teamly_certificate_template.pdf"
  );
  cachedTemplate = await readFile(templatePath);
  return cachedTemplate;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const supabase = await createServerSupabaseClient();

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
      certificate_url,
      completed_at,
      expiry_date,
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

  // 4. Get company name
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", record.profile.company_id)
    .single();

  // 5. Check for cached PDF in Supabase Storage
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
        "Cache-Control": "private, max-age=31536000",
      },
    });
  }

  // 6. Generate new PDF
  // Calculate expiry: use DB value or default to 24 months from completion
  let expiryDateStr = record.expiry_date;
  if (!expiryDateStr && record.completed_at) {
    const expiry = new Date(record.completed_at);
    expiry.setMonth(expiry.getMonth() + 24);
    expiryDateStr = expiry.toISOString();
  }

  const certificateData: CertificateData = {
    candidate_name: record.profile.full_name || "Unknown",
    course_title: record.course.name || "Unknown Course",
    completion_date: formatDate(record.completed_at),
    expiry_date: formatDate(expiryDateStr),
    organisation: company?.name || "N/A",
    certificate_number: record.certificate_number || "N/A",
  };

  try {
    const templateBytes = await getTemplateBytes();
    const pdfBytes = await generateCertificatePdf(certificateData, templateBytes);

    // 7. Cache PDF to Supabase Storage (non-blocking)
    supabase.storage
      .from("documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      })
      .catch((err: any) => console.error("Failed to cache certificate:", err));

    // 8. Update training record with certificate URL if not already set
    if (!record.certificate_url) {
      const publicUrl = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath).data.publicUrl;

      supabase
        .from("training_records")
        .update({ certificate_url: publicUrl })
        .eq("id", record.id)
        .then(({ error }) => {
          if (error) console.error("Failed to update certificate URL:", error);
        });
    }

    // 9. Return PDF
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
