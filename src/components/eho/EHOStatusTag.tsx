import React from "react";

type Status = "valid" | "due_review" | "expired" | string;

export function EHOStatusTag({ status, count }: { status: Status; count: number }) {
  const label = status === "valid" ? "Valid" : status === "due_review" ? "Due" : status === "expired" ? "Expired" : status;
  const color = status === "valid" ? "text-green-600 dark:text-green-400" : status === "due_review" ? "text-yellow-600 dark:text-yellow-400" : status === "expired" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-slate-300";
  const border = status === "valid" ? "border-green-300 dark:border-green-400/40" : status === "due_review" ? "border-yellow-300 dark:border-yellow-400/40" : status === "expired" ? "border-red-300 dark:border-red-400/40" : "border-gray-200 dark:border-white/20";

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${color} bg-gray-50 dark:bg-white/[0.03] border ${border} rounded-md px-3 py-1`}
    >
      <span>{label}</span>
      <span className="text-gray-500 dark:text-slate-300">({count})</span>
    </span>
  );
}
