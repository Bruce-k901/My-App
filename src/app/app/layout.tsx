import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "black", color: "yellow", padding: "40px" }}>
        <div>ROOT LAYOUT ACTIVE</div>
        {children}
      </body>
    </html>
  );
}
