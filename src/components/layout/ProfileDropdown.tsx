"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";

export function ProfileDropdown() {
  const { profile, signOut } = useAppContext();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : profile?.email?.[0]?.toUpperCase() || "U";

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email || "User";

  const buttonRect = buttonRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 h-10 px-3 rounded-lg transition-all
          ${isOpen
            ? "bg-black/[0.05] dark:bg-white/[0.08] border border-[#EC4899]"
            : "bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
          }
        `}
      >
        <div className="w-8 h-8 rounded-full bg-[#EC4899] flex items-center justify-center text-white font-medium text-sm">
          {initials}
        </div>
        <ChevronDown className={`w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && mounted && buttonRect && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-[rgb(var(--surface-elevated))] dark:bg-[#1a1a1a] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-lg shadow-lg min-w-[240px] py-2 z-50"
          style={{
            top: `${buttonRect.bottom + 8}px`,
            right: `${window.innerWidth - (buttonRect.right || 0)}px`,
          }}
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-[rgb(var(--border))] dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EC4899] flex items-center justify-center text-white font-medium">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[rgb(var(--text-primary))] dark:text-white font-medium truncate">{displayName}</div>
                <div className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-sm truncate">{profile?.email}</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors text-[rgb(var(--text-primary))] dark:text-white/80 dark:hover:text-white"
            >
              <Settings className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60" />
              <span>Settings</span>
            </Link>
            {profile?.id && (
              <Link
                href={`/dashboard/people/${profile.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.06] transition-colors text-white/80 hover:text-white"
              >
                <User className="w-4 h-4 text-white/60" />
                <span>My Profile</span>
              </Link>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgb(var(--border))] dark:bg-white/[0.06] my-1" />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 transition-colors text-red-400 hover:text-red-300 text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
