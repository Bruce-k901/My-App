"use client";

import { redirect } from 'next/navigation';

export default function ProductionSettingsPage() {
  // Redirect to first settings page in the sidebar order
  redirect('/dashboard/planly/settings/destination-groups');
}
