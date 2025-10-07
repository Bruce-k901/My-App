"use client";

import { AppContextProvider } from "@/context/AppContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardRouter from "@/components/dashboard/DashboardRouter";
import { ToastProvider } from "@/components/ui/ToastProvider";

export default function DashboardPage() {
  return (
    <AppContextProvider>
      <ToastProvider>
        <DashboardLayout>
          <DashboardRouter />
        </DashboardLayout>
      </ToastProvider>
    </AppContextProvider>
  );
}
