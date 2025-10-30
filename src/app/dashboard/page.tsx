"use client";

import { useAppContext } from "@/context/AppContext";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";

export default function DashboardHomePage() {
  const { role, profile } = useAppContext();

  if (role === "Staff") {
    return <StaffDashboard userName={profile?.full_name || "Staff Member"} />;
  }

  return <ManagerDashboard userName={profile?.full_name || "Manager"} />;
}
