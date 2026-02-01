"use client";

import { X } from "lucide-react";
import { SidebarContent } from "../layout/SidebarContent";
import { ContextSwitcher } from "../layout/ContextSwitcher";
import { SiteFilter } from "../layout/SiteFilter";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-[280px] bg-[#1a1a1a] border-r border-white/[0.06] 
          flex flex-col z-50 lg:hidden transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context Switchers */}
        <div className="p-4 space-y-2 border-b border-white/[0.06]">
          <ContextSwitcher />
          <SiteFilter />
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
