"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TooltipProps {
  children: React.ReactNode;
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ children, label, side = "right", delay = 150 }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const offset = {
    top: "translate(-50%, -100%) translateY(-8px)",
    bottom: "translate(-50%, 100%) translateY(8px)",
    left: "translate(-100%, -50%) translateX(-8px)",
    right: "translate(100%, -50%) translateX(8px)",
  }[side];

  const position = {
    top: "bottom-full left-1/2",
    bottom: "top-full left-1/2",
    left: "right-full top-1/2",
    right: "left-full top-1/2",
  }[side];

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onTouchStart={show}
      onTouchEnd={hide}
      onTouchCancel={hide}
    >
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 2 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute ${position} z-50`}
            style={{ transform: offset }}
          >
            <div className="bg-[#14161c]/95 backdrop-blur-sm text-white/90 text-xs px-2.5 py-1 rounded-md border border-white/[0.08] shadow-[0_0_14px_rgba(211, 126, 145,0.25)] whitespace-nowrap pointer-events-none">
              {label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}