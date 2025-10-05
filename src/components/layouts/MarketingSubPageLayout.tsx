"use client";
import React from "react";
import MarketingHeader from "./MarketingHeader";

export default function MarketingSubPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
