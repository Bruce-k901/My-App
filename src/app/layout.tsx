import "./globals.css";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import { AppContextProvider } from "@/context/AppContext";
import { ToastProvider } from "@/components/ui/ToastProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Checkly",
  description: "Chaos into clarity for hospitality operations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="bg-neutral-950 text-white font-sans">
        <QueryProvider>
          <ToastProvider>
            <AppContextProvider>{children}</AppContextProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
