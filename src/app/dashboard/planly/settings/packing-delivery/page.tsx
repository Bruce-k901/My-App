"use client";

import { redirect } from 'next/navigation';

// Redirect to destination-groups (the underlying page)
// The destination-groups page has been updated with the new "Packing & Delivery" branding
export default function PackingDeliveryPage() {
  redirect('/dashboard/planly/settings/destination-groups');
}
