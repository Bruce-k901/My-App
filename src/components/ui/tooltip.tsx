"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TooltipContextValue = {
  delay: number;
};

const TooltipCtx = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children, delayDuration = 150 }: { children: React.ReactNode; delayDuration?: number }) {
  const value = useMemo(() => ({ delay: delayDuration }), [delayDuration]);
  return <TooltipCtx.Provider value={value}>{children}</TooltipCtx.Provider>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-block">{children}</div>;
}

export function TooltipTrigger({ asChild = false, children, onHoverChange }: { asChild?: boolean; children: React.ReactNode; onHoverChange?: (hover: boolean) => void }) {
  const child = React.Children.only(children as any) as React.ReactElement;
  if (asChild && React.isValidElement(child)) {
    return React.cloneElement(child, {
      onMouseEnter: (e: any) => {
        child.props.onMouseEnter?.(e);
        onHoverChange?.(true);
      },
      onMouseLeave: (e: any) => {
        child.props.onMouseLeave?.(e);
        onHoverChange?.(false);
      },
    });
  }
  return (
    <span
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className="inline-flex"
    >
      {children}
    </span>
  );
}

export function TooltipContent({ side = "right", className, children }: { side?: "right" | "left" | "top" | "bottom"; className?: string; children: React.ReactNode }) {
  const { delay } = useContext(TooltipCtx) || { delay: 0 };
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const show = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setVisible(false);
  };

  const pos = {
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    top: "left-1/2 -translate-x-1/2 bottom-full mb-2",
    bottom: "left-1/2 -translate-x-1/2 top-full mt-2",
  }[side];

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      className="absolute"
    >
      <div
        className={cn(
          "pointer-events-none transition-opacity transition-transform duration-150",
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1",
          pos,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}