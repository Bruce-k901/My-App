"use client";

import { useAppContext } from "@/context/AppContext";

export default function DashboardDebug() {
  const context = useAppContext();
  
  console.log("🔍 Dashboard Debug - Full Context:", context);
  
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 m-4">
      <h3 className="text-red-400 font-bold mb-2">Dashboard Debug Info</h3>
      <div className="text-sm text-theme-secondary space-y-1">
        <div>Loading: {String(context.loading)}</div>
        <div>Session: {context.session ? "✅" : "❌"}</div>
        <div>User: {context.user ? "✅" : "❌"}</div>
        <div>Company ID: {context.companyId || "❌ MISSING"}</div>
        <div>Role: {context.role || "❌ MISSING"}</div>
        <div>Company: {context.company ? "✅" : "❌"}</div>
        <div>Profile: {context.profile ? "✅" : "❌"}</div>
        <div>Error: {context.error || "None"}</div>
      </div>
      
      {context.session && (
        <div className="mt-2 text-xs text-theme-tertiary">
          <div>Session User ID: {context.session.user?.id}</div>
          <div>Session Email: {context.session.user?.email}</div>
        </div>
      )}
      
      {context.profile && (
        <div className="mt-2 text-xs text-theme-tertiary">
          <div>Profile Company ID: {context.profile.company_id}</div>
          <div>Profile Role: {context.profile.role}</div>
        </div>
      )}
    </div>
  );
}
