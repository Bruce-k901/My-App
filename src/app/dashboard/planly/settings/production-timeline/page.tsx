"use client";

import { redirect } from 'next/navigation';

// Redirect to process-templates (the underlying page)
// The process-templates page has been updated with the new "Production Timeline" branding
export default function ProductionTimelinePage() {
  redirect('/dashboard/planly/settings/process-templates');
}
