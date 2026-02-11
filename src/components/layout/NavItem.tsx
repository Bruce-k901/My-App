"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  color?: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string | number;
  onClick?: () => void;
}

export function NavItem({
  icon,
  label,
  href,
  color,
  active,
  disabled,
  badge,
  onClick,
}: NavItemProps) {
  if (disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-40 cursor-not-allowed pointer-events-none">
        <div className="w-5 h-5 flex items-center justify-center text-white/60">
          {icon}
        </div>
        <span className="flex-1 text-sm font-medium text-white/80">{label}</span>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-semibold bg-[#D37E91] text-white rounded-full">
            {badge}
          </span>
        )}
      </div>
    );
  }

  const Wrapper = onClick ? 'button' : Link;
  const wrapperProps = onClick
    ? { onClick, type: 'button' as const }
    : { href };

  return (
    <Wrapper
      {...wrapperProps as any}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group w-full text-left",
        active && "bg-module-fg/[0.10]",
        !active && "hover:bg-module-fg/[0.04]"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-5 h-5 flex items-center justify-center transition-colors",
          active ? "text-white" : "text-white/60 group-hover:text-white/80"
        )}
        style={active && color ? { color } : {}}
      >
        {icon}
      </div>

      {/* Label */}
      <span
        className={cn(
          "flex-1 text-sm font-medium transition-colors",
          active ? "text-white" : "text-white/50 group-hover:text-white/80"
        )}
        style={active && color ? { color } : {}}
      >
        {label}
      </span>

      {/* Badge (optional) */}
      {badge && (
        <span className="px-2 py-0.5 text-xs font-semibold bg-[#D37E91] text-white rounded-full">
          {typeof badge === "number" && badge > 99 ? "99+" : badge}
        </span>
      )}
    </Wrapper>
  );
}
