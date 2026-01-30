"use client";

import { redirect } from 'next/navigation';

export default function ProductionSettingsPage() {
  redirect('/dashboard/planly/settings/process-templates');
}
