"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/checkly_logo_touching_blocks.png";

export default function AuthLogoHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[#0b0e17]/95 backdrop-blur border-b border-slate-800 text-white shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto flex items-center justify-center px-10 py-5">
        <Link href="/" className="flex items-center">
          <Image
            src={logo as any}
            alt="Checkly logo"
            width={288}
            height={72}
            priority
            className="object-contain transition-all duration-200 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
          />
        </Link>
      </div>
    </header>
  );
}