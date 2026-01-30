# Certificate System Documentation

## Overview

The certificate system generates print-ready PDF certificates when staff complete courses. Certificates are automatically created and linked to training records in the database.

## Architecture

```
Course Completion
      ↓
POST /api/courses/complete
      ↓
completeCourseWithCertificate()
      ↓
Creates training_record with certificate_number
      ↓
Certificate available at /api/certificates/[recordId]
```

## Files

### Core Files

- **`src/lib/certificates/generateCertificatePdf.ts`** - PDF generation logic
- **`src/lib/certificates/courseMapping.ts`** - Maps course IDs to database courses
- **`src/lib/certificates/courseCompletion.ts`** - Handles course completion and training record creation
- **`src/app/api/certificates/[recordId]/route.ts`** - API endpoint to download certificates
- **`src/app/api/courses/complete/route.ts`** - API endpoint to complete courses

### Template

- **`private/certificates/teamly_certificate_template.pdf`** - Base PDF template (A4 landscape)

## Adding a New Course

To link a new course to the certificate system:

### 1. Add Course Mapping

Edit `src/lib/certificates/courseMapping.ts` and add your course:

```typescript
{
  courseId: "your-course-id",           // From course JSON file
  courseName: "Your Course Name",      // Must match training_courses.name
  courseCode: "YC-L2",                  // Optional, for certificate numbers
  generatesCertificate: true,           // Set to true to enable certificates
}
```

### 2. Ensure Database Course Exists

The course must exist in the `training_courses` table with:

- `name` matching `courseName` in the mapping, OR
- `code` matching `courseCode` in the mapping

### 3. Update Course JSON

Ensure your course JSON file in `src/data/courses/` has:

- `id` matching the `courseId` in the mapping
- `title` matching the course name

### 4. Test

1. Complete the course through the UI
2. Check that a training record is created
3. Verify certificate can be downloaded at `/api/certificates/[recordId]`

## Certificate Generation

Certificates are generated automatically when:

1. A course is completed via `/api/courses/complete`
2. The course has `generatesCertificate: true` in the mapping
3. The user passes the course (score >= pass_mark_percentage)

## Certificate Data

Certificates include:

- **Candidate Name** - From `profiles.full_name`
- **Course Title** - From `training_courses.name`
- **Site Name** - From `sites.name` (via course_assignment)
- **Company Name** - From `companies.name`
- **Completion Date** - From `training_records.completed_at`
- **Expiry Date** - From `training_records.expiry_date`
- **Certificate ID** - From `training_records.certificate_number`
- **Score** - From `training_records.score_percentage`

## API Endpoints

### Complete Course

```
POST /api/courses/complete
Content-Type: application/json

{
  "courseId": "uk-l2-food-safety",
  "scorePercentage": 85,
  "assignmentId": "optional-uuid",
  "siteId": "optional-uuid"
}

Response:
{
  "success": true,
  "trainingRecordId": "uuid",
  "certificateNumber": "FS-L2-2026-ABC123",
  "certificateUrl": "/api/certificates/uuid"
}
```

### Download Certificate

```
GET /api/certificates/[recordId]

Response: PDF file
```

## Storage

Certificates are cached in Supabase Storage:

- **Bucket**: `documents`
- **Path**: `certificates/{certificate_number}.pdf`
- **RLS**: Users can only access certificates for their own company

## Training Records

When a course is completed:

1. A `training_record` is created/updated
2. `status` is set to `'completed'`
3. `certificate_number` is generated (if applicable)
4. `certificate_url` is set to the storage URL
5. `expiry_date` is calculated from `certification_validity_months`

## Current Courses

| Course ID                 | Course Name                     | Certificate |
| ------------------------- | ------------------------------- | ----------- |
| `uk-l2-food-safety`       | Food Safety Level 2 (UK)        | ✅          |
| `uk-l2-health-and-safety` | Health and Safety Level 2 (UK)  | ✅          |
| `uk-l2-allergens`         | Allergen Awareness Level 2 (UK) | ✅          |

## Troubleshooting

### Certificate not generating

1. Check course mapping exists in `courseMapping.ts`
2. Verify `generatesCertificate: true`
3. Ensure course exists in `training_courses` table
4. Check user passed the course (score >= pass mark)

### Certificate download fails

1. Verify training record exists and `passed = true`
2. Check user has access (same company or is owner)
3. Verify template PDF exists at `private/certificates/teamly_certificate_template.pdf`

### Training record not created

1. Check course mapping matches database course name/code
2. Verify `complete_training` RPC function exists
3. Check user profile exists and has `company_id`
