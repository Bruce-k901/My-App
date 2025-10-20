import * as React from "react";
import { cn } from "@/lib/utils";

export function ListContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const base = cn(
    // Consistent spacing and alignment across list pages
    "grid grid-cols-1 gap-2",
  );
  return <div className={cn(base, className)}>{children}</div>;
}