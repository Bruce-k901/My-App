import "./globals.css";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AppContextProvider } from "@/context/AppContext";
import Footer from "@/components/layouts/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import RouteLogger from "@/components/RouteLogger";

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
  // kill GoTrueClient spam in dev logs
  if (process.env.NODE_ENV === "development") {
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0]?.toString().includes("GoTrueClient")) return;
      originalLog(...args);
    };
  }

  return (
    <html lang="en" className={manrope.variable}>
      <body className="bg-neutral-950 text-white font-sans">
        <QueryProvider>
          <ToastProvider>
            <AppContextProvider>
              {/* Auth provider wraps the actual app tree */}
              <AuthProvider>
                <RouteLogger />
                {children}
                <Footer />
              </AuthProvider>
            </AppContextProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
