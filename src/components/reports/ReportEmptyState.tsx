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
    <div className="bg-theme-surface border border-theme rounded-xl p-8 text-center">
      <Icon className="w-12 h-12 text-theme-tertiary mx-auto mb-4" />
      <p className="text-theme-secondary">{message}</p>
    </div>
  );
}
