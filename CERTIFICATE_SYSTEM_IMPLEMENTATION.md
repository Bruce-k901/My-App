# Certificate System Implementation - Complete ✅

## What Was Built

### 1. Core Certificate Generator

- **`src/lib/certificates/generateCertificatePdf.ts`** - PDF generation using pdf-lib
  - Loads template from `/private/certificates/teamly_certificate_template.pdf`
  - Stamps dynamic content (name, course, dates, score, etc.)
  - Implements shrink-to-fit for long names and titles
  - Returns crisp, vector PDF bytes

### 2. Course Mapping System

- **`src/lib/certificates/courseMapping.ts`** - Maps course IDs to database courses
  - Links course JSON files to `training_courses` table
  - Currently mapped:
    - `uk-l2-food-safety` → Food Safety Level 2 (UK)
    - `uk-l2-health-and-safety` → Health and Safety Level 2 (UK)
    - `uk-l2-allergens` → Allergen Awareness Level 2 (UK)

### 3. Course Completion Handler

- **`src/lib/certificates/courseCompletion.ts`** - Handles course completion
  - Creates/updates training records
  - Generates certificate numbers
  - Calculates expiry dates
  - Links to course assignments

### 4. API Endpoints

#### Certificate Download

- **`src/app/api/certificates/[recordId]/route.ts`**
  - GET endpoint to download certificates
  - Checks user access (owner or manager in same company)
  - Caches PDFs in Supabase Storage
  - Returns PDF as download

#### Course Completion

- **`src/app/api/courses/complete/route.ts`**
  - POST endpoint to complete courses
  - Creates training records
  - Generates certificates automatically
  - Returns certificate URL

### 5. Documentation

- **`docs/CERTIFICATE_SYSTEM.md`** - Complete system documentation
- **`private/certificates/README.md`** - Template requirements

## Dependencies Installed

- ✅ `pdf-lib` - PDF generation library

## Setup Required

### 1. Add Certificate Template

Place the base PDF template at:

```
private/certificates/teamly_certificate_template.pdf
```

**Template Requirements:**

- A4 Landscape (842 x 595 points)
- Contains branding, borders, headings
- Placeholder areas left blank (we stamp on top)
- See `private/certificates/README.md` for details

### 2. Ensure Storage Bucket Exists

The system uses Supabase Storage bucket `documents` for caching certificates.

If it doesn't exist, create it:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);
```

### 3. Verify Training Courses Exist

Ensure these courses exist in `training_courses` table:

- "Food Safety Level 2 (UK)" (code: "FS-L2")
- "Health and Safety Level 2 (UK)" (code: "HS-L2")
- "Allergen Awareness Level 2 (UK)" (code: "ALG-L2")

## How It Works

### Course Completion Flow

1. User completes course → Frontend calls `/api/courses/complete`
2. System creates `training_record` with:
   - `status = 'completed'`
   - `certificate_number` (if course generates certificates)
   - `expiry_date` (calculated from course validity)
   - `score_percentage` and `passed`
3. Certificate is available at `/api/certificates/[recordId]`

### Certificate Download Flow

1. User requests certificate → GET `/api/certificates/[recordId]`
2. System checks:
   - User is authenticated
   - User owns certificate OR is manager in same company
   - Training record exists and `passed = true`
3. System checks cache in Supabase Storage
4. If cached: returns cached PDF
5. If not: generates PDF, caches it, returns PDF

## Adding New Courses

To link a new course to certificates:

1. **Add to mapping** (`src/lib/certificates/courseMapping.ts`):

```typescript
{
  courseId: "your-course-id",
  courseName: "Your Course Name",
  courseCode: "YC-L2",
  generatesCertificate: true,
}
```

2. **Ensure database course exists** with matching name or code

3. **Test** by completing the course

See `docs/CERTIFICATE_SYSTEM.md` for full details.

## Training Records Updated

When certificates are issued:

- ✅ `training_records.certificate_number` is set
- ✅ `training_records.certificate_url` is set (to storage URL)
- ✅ `training_records.status` is set to `'completed'`
- ✅ `training_records.completed_at` is set
- ✅ `training_records.expiry_date` is calculated
- ✅ `course_assignments.status` is updated to `'completed'` (if assignment exists)

## Files Modified

- ✅ `.gitignore` - Added `/private/` directory
- ✅ `package.json` - Added `pdf-lib` dependency

## Next Steps

1. **Add template PDF** to `private/certificates/teamly_certificate_template.pdf`
2. **Test certificate generation** by completing a course
3. **Verify storage bucket** exists and has proper RLS policies
4. **Update course completion UI** to call `/api/courses/complete` when courses finish

## Testing

To test the system:

1. Complete a course (Food Safety, Health & Safety, or Allergens)
2. Check that a training record is created
3. Download certificate: `GET /api/certificates/[trainingRecordId]`
4. Verify PDF contains all correct information
5. Check that certificate is cached in storage

## Notes

- Certificates are **portable documents** - no URLs or links
- PDFs are **cached** in Supabase Storage for performance
- Only **passed courses** generate certificates
- Certificate numbers follow format: `{CODE}-{YEAR}-{RANDOM}` (e.g., "FS-L2-2026-ABC123")
