"use client";

import { redirect } from 'next/navigation';

// Redirect to the new combined Oven & Trays page
// Bake Groups are now managed in the "Bake Groups" tab of Oven & Trays
export default function BakeGroupsPage() {
  redirect('/dashboard/planly/settings/oven-trays');
}
