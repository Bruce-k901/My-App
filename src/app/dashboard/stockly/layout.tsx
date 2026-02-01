'use client';

export default function StocklyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sidebar is now handled by the dashboard layout
  // Mobile navigation is now unified in the main dashboard layout
  return <>{children}</>;
}
