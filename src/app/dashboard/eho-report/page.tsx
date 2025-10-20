"use client";
import {
  ClipboardCheck,
  Wrench,
  FileText,
  Users,
  AlertTriangle,
  BadgeCheck,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import { isRoleGuardEnabled } from "@/lib/featureFlags";
import Link from "next/link";
import { EHOSection } from "@/components/eho/EHOSection";
import { EHOCards } from "@/components/eho/EHOCards";

type ReportData = {
  policies: any[] | null;
  risks: any[] | null;
  coshh: any[] | null;
};

export default function EHOReportPage() {
  const { role } = useAppContext();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: policies } = await supabase.from("policies").select("*");
        const { data: risks } = await supabase.from("risk_assessments").select("*");
        const { data: coshh } = await supabase.from("coshh_register").select("*");
        setReportData({ policies: policies || null, risks: risks || null, coshh: coshh || null });
      } catch (e: any) {
        setError(e?.message ?? "Failed to load EHO report data.");
      } finally {
        setLoading(false);
      }
    }
    // Only enforce role-based restriction when the feature flag is enabled
    if (isRoleGuardEnabled() && role && role !== "admin" && role !== "manager") {
      setError("You do not have permission to view this report.");
      setLoading(false);
      return;
    }
    fetchData();
  }, [role]);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-8 text-white">
        <p className="text-slate-400">Loading EHO Readiness Report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-8 text-white space-y-4">
        <h1 className="text-2xl font-semibold">{isRoleGuardEnabled() ? "Access Restricted" : "Error"}</h1>
        <p className="text-slate-300 text-sm">{error}</p>
        <Link href="/dashboard" className="text-magenta-400 hover:text-magenta-300 text-sm">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8 text-white space-y-6">
      <h1 className="text-3xl font-semibold mb-2 flex items-center gap-2">
        <ShieldCheck className="w-7 h-7 text-pink-400" />
        EHO Readiness Report
      </h1>

      {/* Sections */}
      <EHOCards data={reportData} />

      {/* Compliance Summary Block */}
      <section className="bg-white/[0.05] border border-pink-400/30 rounded-2xl p-6 text-center">
        <BadgeCheck className="w-10 h-10 text-pink-400 mx-auto mb-2" />
        <p className="text-lg font-semibold">Overall Compliance: 95%</p>
        <button className="mt-4 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-md text-white">
          Export EHO Pack (PDF)
        </button>
      </section>
    </div>
  );
}