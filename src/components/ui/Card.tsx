import React from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}
