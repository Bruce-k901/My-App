"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function QuickDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuickData = async () => {
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        // Get profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (!profile?.company_id) {
          setLoading(false);
          return;
        }

        // Get company
        const { data: company } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profile.company_id)
          .single();

        // Get basic counts
        const [
          { count: sitesCount },
          { count: assetsCount },
          { count: tasksCount }
        ] = await Promise.all([
          supabase.from("sites").select("id", { count: "exact" }).eq("company_id", profile.company_id),
          supabase.from("assets").select("id", { count: "exact" }).eq("company_id", profile.company_id),
          supabase.from("tasks").select("id", { count: "exact" }).eq("company_id", profile.company_id)
        ]);

        setData({
          user: session.user,
          profile,
          company,
          counts: {
            sites: sitesCount || 0,
            assets: assetsCount || 0,
            tasks: tasksCount || 0
          }
        });

      } catch (error) {
        console.error("Error loading quick data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadQuickData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-xl">Loading quick dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Unable to load dashboard data</div>
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
        <h1 className="text-4xl font-bold mb-8">Quick Dashboard</h1>
        
        {/* Welcome */}
        <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome, {data.profile.full_name || data.user.email}!
          </h2>
          <p className="text-white/80">
            {data.company.name} • {data.profile.app_role}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-pink-400 mb-2">{data.counts.sites}</div>
            <div className="text-white/80">Sites</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">{data.counts.assets}</div>
            <div className="text-white/80">Assets</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">{data.counts.tasks}</div>
            <div className="text-white/80">Tasks</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Navigation</h3>
            <div className="space-y-2">
              <a href="/dashboard" className="block text-pink-400 hover:text-pink-300">Main Dashboard</a>
              <a href="/dashboard/sites" className="block text-pink-400 hover:text-pink-300">Sites</a>
              <a href="/dashboard/assets" className="block text-pink-400 hover:text-pink-300">Assets</a>
              <a href="/dashboard/tasks" className="block text-pink-400 hover:text-pink-300">Tasks</a>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Debug Pages</h3>
            <div className="space-y-2">
              <a href="/test-session" className="block text-blue-400 hover:text-blue-300">Test Session</a>
              <a href="/dashboard/simple" className="block text-blue-400 hover:text-blue-300">Simple Dashboard</a>
              <a href="/dashboard/minimal" className="block text-blue-400 hover:text-blue-300">Minimal Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
