"use client";
import { ReactNode } from "react";
import MarketingSubPageLayout from "@/components/layouts/MarketingSubPageLayout";

export default function MarketingGroupLayout({ children }: { children: ReactNode }) {
  return <MarketingSubPageLayout>{children}</MarketingSubPageLayout>;
}