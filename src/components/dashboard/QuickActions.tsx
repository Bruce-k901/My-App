"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function QuickActions() {
  const [open, setOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const actions = [
    { label: "Add Task", icon: ClipboardList },
    { label: "Log Incident", icon: AlertTriangle },
    { label: "Upload Cert", icon: Upload },
    { label: "Add SOP", icon: FileText },
    { label: "Add User", icon: Users },
    { label: "Add Asset", icon: Wrench },
    { label: "Settings", icon: Settings },
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
    <div className="fixed top-28 right-8 z-40 flex flex-col items-end gap-2 transition-all">
      {/* Toggle Button */}
      <motion.button
        animate={{ opacity: open ? [1, 1, 0.6, 0.3] : 1 }}
        transition={{ duration: 5, ease: "easeOut" }}
        onClick={() => {
          // Toggle menu; timer effect handles auto-close
          setOpen(!open);
        }}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-500 text-white shadow-lg hover:shadow-pink-500/40 transition-all"
      >
        {open ? (
          <Minus className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </motion.button>

      {/* Actions List */}
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-300 ${
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        {actions.map(({ label, icon: Icon }) => (
          <Tooltip key={label} label={label} side="left" delay={150}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                // Execute action and close instantly
                setOpen(false);
              }}
              className={`flex items-center justify-center gap-2 
                ${isCompact ? "w-10 h-10" : "px-3 py-1.5"} 
                bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] 
                rounded-full text-white/90 shadow-[0_0_6px_rgba(236,72,153,0.25)] transition-all`}
            >
              <Icon className="w-4 h-4 text-pink-400" />
              {!isCompact && <span className="text-sm font-medium">{label}</span>}
            </motion.button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}