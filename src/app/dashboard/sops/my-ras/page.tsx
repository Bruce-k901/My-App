"use client";

import { redirect } from 'next/navigation';

export default function MyRAsPage() {
  // Redirect to main risk assessments page
  redirect('/dashboard/risk-assessments');
}
