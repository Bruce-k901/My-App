"use client";

import { SidebarContent } from "./SidebarContent";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = "" }: SidebarProps) {
  return (
    <aside className={`w-[280px] h-[calc(100vh-4rem)] bg-[#1a1a1a] border-r border-white/[0.06] flex flex-col overflow-y-auto ${className}`}>
      <SidebarContent />
    </aside>
  );
}
