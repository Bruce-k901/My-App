'use client'

import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  // Hide footer on authenticated dashboard pages
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/learn')) {
    return null
  }

  return (
    <footer className="global-footer w-full py-6 border-t border-white/10 text-center text-sm text-theme-tertiary bg-transparent">
      <p suppressHydrationWarning>© {new Date().getFullYear()} Opsly. All rights reserved.</p>
      <div className="mt-2 space-x-4">
        <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
        <a href="/terms" className="hover:text-white transition-colors">Terms of Use</a>
      </div>
    </footer>
  );
}