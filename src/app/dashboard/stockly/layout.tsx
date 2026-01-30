'use client';

import { StocklyMobileNav } from '@/components/stockly/mobile-nav';

export default function StocklyLayout({
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
      <StocklyMobileNav />
    </>
  );
}

