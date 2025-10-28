"use client";

import React from "react";
import { HeaderLayout } from "@/components/layout/HeaderLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderLayout userRole="admin">
      {children}
    </HeaderLayout>
  );
}