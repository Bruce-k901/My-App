# Teamly Certificate Generator - Implementation Specification

## Overview

Generate print-ready, crisp, vector PDF certificates on course completion. Certificates are portable documents that staff can take to future employers, so they contain no verification URLs or links - just the facts of achievement.

## Architecture

```
User clicks "Download Certificate"
         ↓
GET /api/certificates/[recordId]
         ↓
Verify user has access to this training_record
         ↓
Fetch all data from DB (training_record + profile + course + site)
         ↓
Check if cached PDF exists in Supabase Storage
         ↓
If cached: return cached PDF
If not: generate PDF, cache it, return PDF
```

---

## Files to Create

| File                                                    | Purpose                         |
| ------------------------------------------------------- | ------------------------------- |
| `/src/lib/certificates/generateCertificatePdf.ts`       | Core PDF generation logic       |
| `/src/app/api/certificates/[recordId]/route.ts`         | API endpoint (GET)              |
| `/private/certificates/teamly_certificate_template.pdf` | Base template (NOT in /public/) |

**Note:** The `/private/` directory should be added to `.gitignore` exclude patterns if it contains sensitive assets.

---

## Certificate Data (Derived from Database)

All certificate data is fetched from the database - **never** accept raw certificate data from API requests.

```typescript
interface CertificateData {
  // From training_record
  certificate_number: string; // e.g., "FS-L2-2025-ABC123"
  completion_date: string; // Formatted: "23 January 2026"
  expiry_date: string; // Formatted: "23 January 2029"
  score_percentage: number; // e.g., 87

  // From profile (via training_record.profile_id)
  candidate_name: string; // e.g., "Alexandra Johnson"

  // From course (via training_record.course_id)
  course_title: string; // e.g., "Food Safety Level 2 (UK)"

  // From site (via course_assignment.confirmation_site_id)
  site_name: string; // e.g., "Edinburgh Hub"
  company_name: string; // e.g., "Acme Restaurants Ltd"
}
```

---

## Install Dependencies

```bash
npm i pdf-lib
```

---

## Generator Logic (`generateCertificatePdf.ts`)

```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface CertificateData {
  candidate_name: string;
  course_title: string;
  site_name: string;
  company_name: string;
  completion_date: string;
  expiry_date: string;
  certificate_number: string;
  score_percentage: number;
}

// A4 Landscape coordinates (points, origin bottom-left)
const COORDS = {
  // Page center X for A4 landscape
  centerX: 420.94,

  // Main content
  candidateNameY: 330,
  courseTitleY: 265,
  siteNameY: 230,

  // Footer row (3 columns)
  completionX: 170,
  expiryX: 420.94,
  certIdX: 672,
  footerY: 145,

  // Score badge (optional position)
  scoreX: 720,
  scoreY: 330,

  // Max widths for shrink-to-fit
  nameMaxWidth: 680,
  courseMaxWidth: 650,
  siteMaxWidth: 500,
};

/**
 * Shrink font size until text fits within maxWidth
 */
function shrinkToFit(
  font: any,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
): number {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

/**
 * Draw text centered at x coordinate
 */
function drawCentered(
  page: any,
  font: any,
  text: string,
  x: number,
  y: number,
  size: number,
  color: any,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: x - width / 2, y, size, font, color });
}

/**
 * Generate certificate PDF bytes
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  // Load template from private directory (not publicly accessible)
  const templatePath = path.join(
    process.cwd(),
    "private",
    "certificates",
    "teamly_certificate_template.pdf",
  );
  const templateBytes = await readFile(templatePath);

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);

  // Embed fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesBold);

  // Colors
  const primaryInk = rgb(0.06, 0.09, 0.16); // Dark text
  const secondaryInk = rgb(0.35, 0.42, 0.49); // Muted text
  const accentColor = rgb(0.91, 0.29, 0.51); // Opsly pink for score

  // === CANDIDATE NAME ===
  const nameSize = shrinkToFit(fontSerifBold, data.candidate_name, COORDS.nameMaxWidth, 42, 24);
  drawCentered(
    page,
    fontSerifBold,
    data.candidate_name,
    COORDS.centerX,
    COORDS.candidateNameY,
    nameSize,
    primaryInk,
  );

  // === COURSE TITLE ===
  const courseSize = shrinkToFit(fontBold, data.course_title, COORDS.courseMaxWidth, 22, 14);
  drawCentered(
    page,
    fontBold,
    data.course_title,
    COORDS.centerX,
    COORDS.courseTitleY,
    courseSize,
    primaryInk,
  );

  // === SITE & COMPANY ===
  const siteText = `${data.site_name} • ${data.company_name}`;
  const siteSize = shrinkToFit(fontRegular, siteText, COORDS.siteMaxWidth, 14, 10);
  drawCentered(
    page,
    fontRegular,
    siteText,
    COORDS.centerX,
    COORDS.siteNameY,
    siteSize,
    secondaryInk,
  );

  // === FOOTER ROW: Completion Date | Expiry Date | Certificate ID ===

  // Labels (smaller, above values)
  const labelSize = 9;
  const labelY = COORDS.footerY + 18;
  drawCentered(page, fontRegular, "COMPLETED", COORDS.completionX, labelY, labelSize, secondaryInk);
  drawCentered(page, fontRegular, "VALID UNTIL", COORDS.expiryX, labelY, labelSize, secondaryInk);
  drawCentered(
    page,
    fontRegular,
    "CERTIFICATE ID",
    COORDS.certIdX,
    labelY,
    labelSize,
    secondaryInk,
  );

  // Values
  const valueSize = 12;
  drawCentered(
    page,
    fontBold,
    data.completion_date,
    COORDS.completionX,
    COORDS.footerY,
    valueSize,
    primaryInk,
  );
  drawCentered(
    page,
    fontBold,
    data.expiry_date,
    COORDS.expiryX,
    COORDS.footerY,
    valueSize,
    primaryInk,
  );
  drawCentered(
    page,
    fontBold,
    data.certificate_number,
    COORDS.certIdX,
    COORDS.footerY,
    valueSize,
    primaryInk,
  );

  // === SCORE BADGE (top right) ===
  const scoreText = `${data.score_percentage}%`;
  const scoreSize = 28;
  const scoreWidth = fontBold.widthOfTextAtSize(scoreText, scoreSize);
  page.drawText(scoreText, {
    x: COORDS.scoreX - scoreWidth / 2,
    y: COORDS.scoreY,
    size: scoreSize,
    font: fontBold,
    color: accentColor,
  });
  // "SCORE" label below
  drawCentered(page, fontRegular, "SCORE", COORDS.scoreX, COORDS.scoreY - 18, 10, secondaryInk);

  return await pdfDoc.save();
}
```

---

## API Route (`/api/certificates/[recordId]/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generateCertificatePdf, CertificateData } from "@/lib/certificates/generateCertificatePdf";

export async function GET(request: NextRequest, { params }: { params: { recordId: string } }) {
  const supabase = createRouteHandlerClient({ cookies });

  // 1. Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch training record with all related data
  const { data: record, error: fetchError } = await supabase
    .from("training_records")
    .select(
      `
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
    `,
    )
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
    .eq("id", user.id)
    .single();

  const isOwner = record.profile.id === user.id;
  const isSameCompany = record.profile.company_id === currentProfile?.company_id;
  const isManagerOrAbove = [
    "owner",
    "admin",
    "manager",
    "regional_manager",
    "area_manager",
  ].includes(currentProfile?.role || "");

  if (!isOwner && !(isSameCompany && isManagerOrAbove)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // 4. Get site info from course_assignment
  const { data: assignment } = await supabase
    .from("course_assignments")
    .select(
      `
      confirmation_site_id,
      site:sites!course_assignments_confirmation_site_id_fkey (
        name
      )
    `,
    )
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
  const { data: existingFile } = await supabase.storage.from("documents").download(storagePath);

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
    candidate_name: record.profile.full_name,
    course_title: record.course.name,
    site_name: assignment?.site?.name || "N/A",
    company_name: company?.name || "N/A",
    completion_date: formatDate(record.completed_at),
    expiry_date: formatDate(record.expiry_date),
    certificate_number: record.certificate_number,
    score_percentage: record.score_percentage,
  };

  const pdfBytes = await generateCertificatePdf(certificateData);

  // 8. Cache PDF to Supabase Storage (non-blocking)
  supabase.storage
    .from("documents")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    })
    .catch((err) => console.error("Failed to cache certificate:", err));

  // 9. Return PDF
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${record.certificate_number}.pdf"`,
      "Cache-Control": "private, max-age=31536000",
    },
  });
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
```

---

## Certificate Template Design

The base template PDF should contain:

- **Opsly branding** - Logo at top
- **Decorative border** - Professional certificate styling
- **"Certificate of Completion"** heading
- **"This is to certify that"** text
- **Placeholder areas** for dynamic content (leave blank, we stamp on top):
  - Candidate name area
  - Course title area
  - Site/company area
  - Footer row (3 boxes for dates and ID)
  - Score badge area
- **"Powered by Opsly"** small footer text

**Template specifications:**

- Size: A4 Landscape (842 x 595 points)
- Format: PDF (single page)
- No dynamic data in template - all stamped programmatically

---

## Storage Setup

Create a Supabase Storage bucket for certificate caching:

```sql
-- Create storage bucket (run in Supabase dashboard or migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- RLS policy: Users can read their own certificates
CREATE POLICY "Users can read own certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'certificates' AND
  EXISTS (
    SELECT 1 FROM training_records tr
    JOIN profiles p ON tr.profile_id = p.id
    WHERE tr.certificate_number = (storage.filename(name))::text
    AND (p.id = auth.uid() OR p.company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ))
  )
);
```

---

## Frontend Usage

```typescript
// Component to download certificate
function DownloadCertificateButton({ recordId }: { recordId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const response = await fetch(`/api/certificates/${recordId}`);

      if (!response.ok) {
        throw new Error("Failed to download certificate");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download certificate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <Download />}
      Download Certificate
    </Button>
  );
}
```

---

## Certificate Content Summary

What appears on the certificate:

| Field           | Source                                | Example                  |
| --------------- | ------------------------------------- | ------------------------ |
| Candidate Name  | `profile.full_name`                   | Alexandra Johnson        |
| Course Title    | `training_courses.name`               | Food Safety Level 2 (UK) |
| Site Name       | `sites.name` (via assignment)         | Edinburgh Hub            |
| Company Name    | `companies.name`                      | Acme Restaurants Ltd     |
| Completion Date | `training_records.completed_at`       | 23 January 2026          |
| Expiry Date     | `training_records.expiry_date`        | 23 January 2029          |
| Certificate ID  | `training_records.certificate_number` | FS-L2-2026-XYZ789        |
| Score           | `training_records.score_percentage`   | 87%                      |

**What is NOT on the certificate:**

- Verification URLs (certificates are portable documents)
- QR codes
- Links to Opsly platform
- Manager/issuer signatures (auto-verified by system)

---

## Acceptance Criteria

- [ ] PDF generates correctly with all fields populated
- [ ] Long names shrink to fit without overflow
- [ ] Long course titles shrink to fit without overflow
- [ ] Score displays prominently
- [ ] Site and company name appear (context of where training was done)
- [ ] Only authenticated users can download
- [ ] Users can only download their own certificates OR managers can download for their team
- [ ] PDFs are cached in Supabase Storage
- [ ] Cached PDFs are returned on subsequent requests
- [ ] Output is crisp when zoomed to 400%
- [ ] Base template is NOT in /public/ directory
- [ ] Certificate contains no URLs or links (fully portable)
