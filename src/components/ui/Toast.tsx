"use client";

import React, { useEffect } from "react";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  onClose?: () => void;
  durationMs?: number;
};

export default function Toast({ message, type = "info", onClose, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(() => onClose && onClose(), durationMs);
    return () => clearTimeout(id);
  }, [onClose, durationMs]);

  const base =
    "fixed bottom-6 right-6 z-50 px-4 py-3 rounded shadow-lg text-sm font-medium border";
  const styles: Record<string, string> = {
    info: "bg-[#141823] border-neutral-700 text-slate-200",
    success: "bg-[#141823] border-green-600 text-green-300",
    warning: "bg-[#141823] border-yellow-600 text-yellow-200",
    error: "bg-[#141823] border-red-600 text-red-300",
  };

  return <div className={`${base} ${styles[type]}`}>{message}</div>;
}