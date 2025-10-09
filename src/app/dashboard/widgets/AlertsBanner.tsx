"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertsBannerProps {
  overduePpm: number;
  tasksLate: number;
  sopsExpiring: number;
}

export default function AlertsBanner({ overduePpm, tasksLate, sopsExpiring }: AlertsBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3",
        "bg-[#EF4444]/20 text-white",
        "flex items-center gap-3",
      )}
    >
      <AlertTriangle className="w-5 h-5 text-red-400" />
      <p className="text-sm">
        ALERT: {overduePpm} overdue PPMs • {tasksLate} tasks late • {sopsExpiring} SOPs expiring
      </p>
    </div>
  );
}