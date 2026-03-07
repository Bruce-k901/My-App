"use client";

import { useAppContext } from '@/context/AppContext';
import { DailyWorksheet } from '@/components/planly/production-plan/DailyWorksheet';

export default function PlanlyDashboardPage() {
  const { siteId } = useAppContext();

  if (!siteId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-theme-tertiary">Please select a site</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <DailyWorksheet siteId={siteId} />
    </div>
  );
}
