"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import type { SiteOption } from "./TeamInviteForm";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  app_role: "staff" | "manager" | "admin";
  site_id: string | null;
  active?: boolean;
}

interface TeamTableProps {
  team: TeamMember[];
  sites: SiteOption[];
  onUpdated: (member: TeamMember) => void;
  onRemoved: (id: string) => void;
}

export default function TeamTable({ team, sites, onUpdated, onRemoved }: TeamTableProps) {
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const siteName = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s.name])), [sites]);

  const updateMember = async (id: string, patch: Partial<TeamMember>) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", id)
        .select("id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
        .single();
      if (error) throw error;
      onUpdated(data as any);
      showToast({ title: "Updated", description: "Team member updated" });
    } catch (err: any) {
      showToast({ title: "Update failed", description: err?.message ?? "Failed to update", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (id: string) => {
    setBusyId(id);
    try {
      // Prefer soft-delete by setting active=false; if column doesn't exist, fall back to delete
      const { error: softErr } = await supabase.from("profiles").update({ active: false }).eq("id", id);
      if (softErr) {
        await supabase.from("profiles").delete().eq("id", id);
      }
      onRemoved(id);
      showToast({ title: "Removed", description: "Team member removed" });
    } catch (err: any) {
      showToast({ title: "Remove failed", description: err?.message ?? "Failed to remove", type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="overflow-x-auto border border-neutral-800 rounded-md">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-900">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Role</th>
            <th className="text-left p-3">Site</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {team?.map((m) => (
            <tr key={m.id} className="border-t border-neutral-800">
              <td className="p-3">
                <div className="flex flex-col">
                  <span className="font-medium">{m.full_name || "—"}</span>
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  
                  <span className="font-medium">{m.full_name || "—"}</span>
                  <span className="text-slate-400 text-xs">{m.email}</span>
                </div>
              </td>
              <td className="p-3">
                <select
                  value={m.app_role}
                  onChange={(e) => updateMember(m.id, { app_role: e.target.value as any })}
                  className="input"
                  disabled={busyId === m.id}
                >
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </td>
              <td className="p-3">
                <select
                  value={m.site_id ?? ""}
                  onChange={(e) => updateMember(m.id, { site_id: e.target.value || null })}
                  className="input"
                  disabled={busyId === m.id}
                >
                  <option value="">Unassigned</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </td>
              <td className="p-3">
                <span className={`text-xs ${m.active === false ? "text-slate-400" : "text-green-400"}`}>
                  {m.active === false ? "Inactive" : "Active/Invited"}
                </span>
              </td>
              <td className="p-3">
                <button
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => removeMember(m.id)}
                  disabled={busyId === m.id}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {(!team || team.length === 0) && (
            <tr>
              <td className="p-3 text-slate-400 text-sm" colSpan={5}>No team members yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}