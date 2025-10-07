"use client";

import { ReactNode } from "react";
import AuthLogoHeader from "./AuthLogoHeader";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0b0d13]">
      <AuthLogoHeader />
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center">{children}</div>
    </div>
  );
}
