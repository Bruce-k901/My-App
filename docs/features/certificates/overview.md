# Certificate System

## Overview

The certificate system generates PDF certificates when staff complete training courses. Certificates are created server-side, cached in Supabase Storage, and linked to training records.

```
Course Completion → POST /api/courses/complete
                  → Creates training_record + certificate_number + course_charge
                  → Certificate PDF at GET /api/certificates/[recordId]
```

## Core Files

| File                                                   | Purpose                              |
| ------------------------------------------------------ | ------------------------------------ |
| `src/lib/certificates/generateCertificatePdf.ts`       | PDF generation using pdf-lib         |
| `src/lib/certificates/courseMapping.ts`                | Maps course IDs to database courses  |
| `src/lib/certificates/courseCompletion.ts`             | Handles completion + record creation |
| `src/app/api/certificates/[recordId]/route.ts`         | Download endpoint (with caching)     |
| `src/app/api/courses/complete/route.ts`                | Course completion endpoint           |
| `private/certificates/teamly_certificate_template.pdf` | A4 landscape template                |

### UI Components

| Component                          | Purpose                             |
| ---------------------------------- | ----------------------------------- |
| `CertificateTaskModal.tsx`         | Handle certificate expiry tasks     |
| `UpdateCertificateExpiryModal.tsx` | Update expiry dates                 |
| `RecordTrainingModal.tsx`          | Manually record training completion |

## Current Courses

| Course ID                 | Name                            | Code   |
| ------------------------- | ------------------------------- | ------ |
| `uk-l2-food-safety`       | Food Safety Level 2 (UK)        | FS-L2  |
| `uk-l2-health-and-safety` | Health and Safety Level 2 (UK)  | HS-L2  |
| `uk-l2-allergens`         | Allergen Awareness Level 2 (UK) | ALG-L2 |

## Certificate Data

Certificates include: Candidate Name, Course Title, Site Name, Company Name, Completion Date, Expiry Date, Certificate ID (format: `{CODE}-{YEAR}-{RANDOM}`), Score.

## API Endpoints

### Complete Course

```http
POST /api/courses/complete
{ "courseId": "uk-l2-food-safety", "scorePercentage": 85, "assignmentId": "optional-uuid" }
→ { "success": true, "trainingRecordId": "uuid", "certificateNumber": "FS-L2-2026-ABC123", "certificateUrl": "/api/certificates/uuid" }
```

**What it does:**

1. Validates authentication and profile
2. Looks up course mapping and database course
3. Checks score >= pass mark (default 70%)
4. Generates certificate number
5. Calculates expiry from `certification_validity_months`
6. Calls `complete_training()` RPC to create/update training record
7. Updates course assignment status to 'completed'
8. Creates `course_charge` record (£5.00 for billing)

### Download Certificate

```http
GET /api/certificates/[recordId] → PDF file
```

**Access:** Certificate holder OR manager+ in same company. Checks storage cache first; generates and caches if not found.

## Storage

- **Bucket:** `documents`
- **Path:** `certificates/{certificate_number}.pdf`
- **Cache:** 1 year (`max-age=31536000`)

## Adding New Courses

### 1. Add Course Mapping

Edit `src/lib/certificates/courseMapping.ts`:

```typescript
{
  courseId: "your-course-id",
  courseName: "Your Course Name",    // Must match training_courses.name
  courseCode: "YC-L2",
  generatesCertificate: true,
}
```

### 2. Ensure Database Course Exists

Course must exist in `training_courses` with matching name or code. Set `certification_validity_months` and `pass_mark_percentage`.

### 3. Test

1. Complete course via `/api/courses/complete`
2. Download certificate: `GET /api/certificates/[recordId]`
3. Verify PDF content and storage cache

## Setup Requirements

1. **Template PDF** at `private/certificates/teamly_certificate_template.pdf` (A4 landscape)
2. **Storage bucket** `documents` in Supabase Storage
3. **Training courses** in database with correct names/codes
4. **`complete_training()` RPC function** in database
5. **Dependency:** `pdf-lib`

## Troubleshooting

**Certificate not generating:** Check courseMapping.ts has entry with `generatesCertificate: true`. Verify course exists in training_courses table. Check score >= pass mark.

**Download fails:** Verify training record exists with `passed = true`. Check user access (same company). Verify template PDF exists. Check storage bucket.

**Training record not created:** Check course mapping matches database name/code. Verify `complete_training()` RPC exists.
