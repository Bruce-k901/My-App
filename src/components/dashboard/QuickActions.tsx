"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Tooltip } from "../ui/tooltip/Tooltip";
import {
  Plus,
  Minus,
  ClipboardList,
  AlertTriangle,
  Upload,
  FileText,
  Users,
  Wrench,
  Settings,
} from "@/components/ui/icons";

export default function QuickActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const actions = [
    { 
      label: "Add Task", 
      icon: ClipboardList,
      action: () => router.push("/dashboard/tasks/templates")
    },
    { 
      label: "Log Incident", 
      icon: AlertTriangle,
      action: () => router.push("/dashboard/incidents")
    },
    { 
      label: "Upload Cert", 
      icon: Upload,
      action: () => router.push("/dashboard/reports")
    },
    { 
      label: "Add SOP", 
      icon: FileText,
      action: () => router.push("/dashboard/sops")
    },
    { 
      label: "Add User", 
      icon: Users,
      action: () => router.push("/dashboard/users")
    },
    { 
      label: "Add Asset", 
      icon: Wrench,
      action: () => router.push("/dashboard/assets")
    },
    { 
      label: "Settings", 
      icon: Settings,
      action: () => router.push("/dashboard/settings")
    },
  ];

  // Auto-close after 5 seconds when open becomes true
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setOpen(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [open]);

  // Responsive collapse below 1024px (tablet/mobile)
  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="fixed top-20 sm:top-28 right-2 sm:right-8 z-40 flex flex-col items-end gap-2 transition-all">
      {/* Toggle Button */}
      <motion.button
        animate={{ opacity: open ? [1, 1, 0.6, 0.3] : 1 }}
        transition={{ duration: 5, ease: "easeOut" }}
        onClick={() => {
          // Toggle menu; timer effect handles auto-close
          setOpen(!open);
        }}
        className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-transparent border-2 border-[#D37E91] text-[#D37E91] shadow-lg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all"
      >
        {open ? (
          <Minus className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
        )}
      </motion.button>

      {/* Actions List */}
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-300 ${
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        {actions.map(({ label, icon: Icon, action }) => (
          <Tooltip key={label} label={label} side="left" delay={150}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                // Execute action and close instantly
                action();
                setOpen(false);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 
                ${isCompact ? "w-9 h-9 sm:w-10 sm:h-10" : "px-2 sm:px-3 py-1 sm:py-1.5"} 
                bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] 
                rounded-full text-white/90 shadow-[0_0_6px_rgba(211, 126, 145,0.25)] transition-all`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D37E91]" />
              {!isCompact && <span className="text-xs sm:text-sm font-medium">{label}</span>}
            </motion.button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}