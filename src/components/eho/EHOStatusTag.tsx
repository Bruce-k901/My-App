import React from "react";

type Status = "valid" | "due_review" | "expired" | string;

export function EHOStatusTag({ status, count }: { status: Status; count: number }) {
  const label = status === "valid" ? "Valid" : status === "due_review" ? "Due" : status === "expired" ? "Expired" : status;
  const color = status === "valid" ? "text-green-400" : status === "due_review" ? "text-yellow-400" : status === "expired" ? "text-red-400" : "text-slate-300";
  const border = status === "valid" ? "border-green-400/40" : status === "due_review" ? "border-yellow-400/40" : status === "expired" ? "border-red-400/40" : "border-white/20";

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${color} bg-white/[0.03] border ${border} rounded-md px-3 py-1`}
    >
      <span>{label}</span>
      <span className="text-slate-300">({count})</span>
    </span>
  );
}