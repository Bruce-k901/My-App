'use client';

import { ChecklyMobileNav } from '@/components/checkly/mobile-nav';

export default function ChecklyLayout({
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
      <ChecklyMobileNav onMoreClick={() => {}} />
    </>
  );
}
