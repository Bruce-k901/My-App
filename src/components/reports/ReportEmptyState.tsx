"use client";

import { ComponentType } from "react";
import { BarChart3 } from '@/components/ui/icons';

interface ReportEmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  message?: string;
}

export default function ReportEmptyState({
  icon: Icon = BarChart3,
  message = "No data available for the selected period",
}: ReportEmptyStateProps) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
      <Icon className="w-12 h-12 text-gray-400 dark:text-white/40 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-white/60">{message}</p>
    </div>
  );
}
