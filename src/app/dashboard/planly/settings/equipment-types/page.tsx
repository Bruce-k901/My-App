"use client";

import { redirect } from 'next/navigation';

// Redirect to the new combined Oven & Trays page
// Tray Types (Equipment Types) are now managed in the "Tray Sizes" tab of Oven & Trays
export default function EquipmentTypesPage() {
  redirect('/dashboard/planly/settings/oven-trays');
}
