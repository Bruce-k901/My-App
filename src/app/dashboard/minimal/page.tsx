"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function MinimalDashboard() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("🔄 Loading minimal dashboard data...");
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }
        
        if (!session?.user) {
          throw new Error("No session found");
        }
        
        console.log("✅ Session found:", session.user.email);
        setSession(session);
        
        // Get profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (profileError) {
          console.error("❌ Profile error:", profileError);
          throw new Error(`Profile error: ${profileError.message}`);
        }
        
        console.log("✅ Profile found:", profileData);
        setProfile(profileData);
        
        if (!profileData.company_id) {
          throw new Error("No company ID in profile");
        }
        
        // Get company
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profileData.company_id)
          .single();
        
        if (companyError) {
          console.error("❌ Company error:", companyError);
          throw new Error(`Company error: ${companyError.message}`);
        }
        
        console.log("✅ Company found:", companyData);
        setCompany(companyData);
        
        setLoading(false);
        
      } catch (err) {
        console.error("❌ Error loading data:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto mb-4"></div>
          <div className="text-xl">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">❌ Error</div>
          <div className="text-white/80 mb-4">{error}</div>
          <a href="/login" className="bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Minimal Dashboard</h1>
        
        {/* Success Message */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-8">
          <h2 className="text-green-400 font-bold text-xl mb-4">✅ Dashboard Loaded Successfully!</h2>
          <p className="text-green-300">All data loaded correctly. The issue was likely in the complex AppContext logic.</p>
        </div>

        {/* User Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-pink-400">User Information</h3>
            <div className="space-y-2 text-sm">
              <div>Email: {session?.user?.email}</div>
              <div>User ID: {session?.user?.id}</div>
              <div>Role: {profile?.app_role || "Not set"}</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-pink-400">Profile Information</h3>
            <div className="space-y-2 text-sm">
              <div>Full Name: {profile?.full_name || "Not set"}</div>
              <div>Company ID: {profile?.company_id || "Not set"}</div>
              <div>Site ID: {profile?.site_id || "Not set"}</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-pink-400">Company Information</h3>
            <div className="space-y-2 text-sm">
              <div>Company Name: {company?.name || "Not set"}</div>
              <div>Company ID: {company?.id || "Not set"}</div>
              <div>Setup Status: {company?.setup_status || "Not set"}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-pink-400">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <a href="/dashboard" className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600">
              Try Main Dashboard
            </a>
            <a href="/dashboard/simple" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Simple Dashboard
            </a>
            <a href="/test-session" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Test Session
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
