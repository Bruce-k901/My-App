"use client";

import React from "react";
import GlassCard from "@/components/ui/GlassCard";

export default function ActivityChart() {
  return (
    <GlassCard className="text-left">
      <p className="text-sm text-theme-tertiary mb-2">Activity</p>
      <div className="h-40 bg-white/[0.03] border border-white/[0.06] rounded-xl" />
    </GlassCard>
  );
}