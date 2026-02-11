"use client";

import Link from "next/link";
import { ArrowLeft, Download, Loader2 } from '@/components/ui/icons';

interface ReportPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  onExportPdf?: () => void;
  exporting?: boolean;
}

export default function ReportPageHeader({
  title,
  subtitle,
  backHref = "/dashboard/reports",
  onExportPdf,
  exporting,
}: ReportPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="p-2 rounded-lg bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-white/60" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {onExportPdf && (
        <button
          onClick={onExportPdf}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export PDF
        </button>
      )}
    </div>
  );
}
