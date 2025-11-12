import { ReactNode } from "react";

// Note: CSS is already imported in root layout.tsx, no need to import again here
export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
