'use client';

import { usePathname } from 'next/navigation';
import { TeamlyMobileNav } from '@/components/teamly/mobile-nav';

export default function TeamlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sidebar is now handled by the dashboard layout
  // This layout just wraps the content
  return (
    <>
      {children}
      {/* Mobile Bottom Nav */}
      <TeamlyMobileNav />
    </>
  );
}
