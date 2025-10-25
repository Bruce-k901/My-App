"use client";

import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";

export default function SimpleDashboard() {
  const { loading, session, user, companyId, role, company, profile, error } = useAppContext();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    setDebugInfo({
      loading,
      hasSession: !!session,
      hasUser: !!user,
      companyId,
      role,
      hasCompany: !!company,
      hasProfile: !!profile,
      error
    });
  }, [loading, session, user, companyId, role, company, profile, error]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-yellow-400 text-xl">No session found. Please log in.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Simple Dashboard</h1>
        
        {/* Debug Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Loading: {String(debugInfo.loading)}</div>
            <div>Has Session: {String(debugInfo.hasSession)}</div>
            <div>Has User: {String(debugInfo.hasUser)}</div>
            <div>Company ID: {debugInfo.companyId || "❌ MISSING"}</div>
            <div>Role: {debugInfo.role || "❌ MISSING"}</div>
            <div>Has Company: {String(debugInfo.hasCompany)}</div>
            <div>Has Profile: {String(debugInfo.hasProfile)}</div>
            <div>Error: {debugInfo.error || "None"}</div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="space-y-2">
            <div>Email: {user.email}</div>
            <div>User ID: {user.id}</div>
            <div>Role: {role || "Not set"}</div>
            <div>Company ID: {companyId || "Not set"}</div>
          </div>
        </div>

        {/* Company Info */}
        {company && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Company Information</h2>
            <div className="space-y-2">
              <div>Company Name: {company.name}</div>
              <div>Company ID: {company.id}</div>
              <div>Setup Status: {company.setup_status}</div>
            </div>
          </div>
        )}

        {/* Profile Info */}
        {profile && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-2">
              <div>Profile ID: {profile.id}</div>
              <div>Company ID: {profile.company_id}</div>
              <div>Role: {profile.role}</div>
              <div>Site ID: {profile.site_id || "Not set"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
