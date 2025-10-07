import "../globals.css";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
