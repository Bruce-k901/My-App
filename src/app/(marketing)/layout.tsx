import "../globals.css";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Checkly – Chaos into Clarity",
  description: "Compliance, logs, alerts, and reports for hospitality operations.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="min-h-screen bg-neutral-950 text-white font-sans antialiased">
        <div style={{ padding: 20, color: "lime" }}>MARKETING LAYOUT ACTIVE</div>
        {children}
      </body>
    </html>
  );
}
