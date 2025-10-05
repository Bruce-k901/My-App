import * as React from "react";
import { cn } from "@/lib/utils";

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
};

export default function Heading({ level = 1, children, className }: HeadingProps) {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

  return (
    <Tag
      className={cn(
        "font-heading",
        level === 1 && "text-4xl md:text-5xl font-bold",
        level === 2 && "text-3xl font-semibold",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
