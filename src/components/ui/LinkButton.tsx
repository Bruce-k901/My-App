import Link from "next/link";
import { cn } from "@/lib/utils";

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  fullWidth?: boolean;
  className?: string;
}

export default function LinkButton({
  href,
  children,
  variant = "primary",
  fullWidth = false,
  className,
}: LinkButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary: "bg-checkly-blue text-white hover:bg-blue-600 focus:ring-blue-600",
    secondary: "bg-checkly-magenta text-white hover:bg-pink-600 focus:ring-pink-600",
    outline:
      "border border-checkly-blue text-checkly-blue hover:bg-checkly-blue hover:text-white focus:ring-checkly-blue",
    ghost: "text-white hover:text-checkly-magenta focus:ring-checkly-magenta",
  };

  return (
    <Link
      href={href}
      className={cn(base, variants[variant], fullWidth && "w-full", "px-4 py-2", className)}
    >
      {children}
    </Link>
  );
}
