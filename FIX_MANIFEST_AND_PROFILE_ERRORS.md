# Error Fixes Summary

## 1. Manifest 401 Error

**Issue:** The application was trying to fetch `/manifest.json` which did not
exist in the `public` directory, resulting in 401 errors (likely due to
middleware or fallback routing). The correct file was `site.webmanifest`.
**Fix:** Updated `src/app/layout.tsx` to point to `/site.webmanifest` instead of
`/manifest.json`.

## 2. Supabase 406 Errors (Profile Queries)

**Issue:** The application was receiving 406 Not Acceptable errors from
Supabase. This occurs when using `.single()` on a query that returns 0 rows (or
more than 1). This was happening when fetching user profiles for users who might
not have a profile record yet. **Fixes:**

- **Attendance Service (`src/lib/notifications/attendance.ts`):** Changed
  `.single()` to `.maybeSingle()` when fetching the user's company ID.
- **Welcome Header (`src/components/dashboard/WelcomeHeader.tsx`):** Changed
  `.single()` to `.maybeSingle()` when fetching the user's full name.

These changes ensure the application handles missing profile data gracefully
instead of throwing network errors.
