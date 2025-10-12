"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import AddUserModal from "@/components/users/AddUserModal";
import Papa from "papaparse";
import { userCsvHeaders, normalizeUsersForCsv } from "@/lib/csv";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_id: string | null;
  site_id: string | null;
  role: "staff" | "manager" | "admin" | string | null;
  position_title: string | null;
  boh_foh: string | null;
  last_login: string | null;
  pin_code: string | null;
};

type Site = { id: string; name: string };

export default function Page() {
  const { companyId, siteId } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [query, setQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const siteName = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s.name])), [sites]);

  const loadUsers = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: pData, error: pErr }, { data: sData, error: sErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, email, full_name, company_id, site_id, role, position_title, boh_foh, last_login, pin_code"
          )
          .eq("company_id", companyId),
        supabase.from("sites").select("id, name").eq("company_id", companyId),
      ]);
      if (pErr) throw pErr;
      if (sErr) throw sErr;
      setProfiles((pData as any) ?? []);
      setSites((sData as any) ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const values = [
        p.full_name ?? "",
        p.email ?? "",
        p.role ?? "",
        p.position_title ?? "",
        siteName[p.site_id ?? ""] ?? "",
      ].map((x) => x.toLowerCase());
      return values.some((v) => v.includes(q));
    });
  }, [profiles, query, siteName]);

  const exportCsv = () => {
    const rows = normalizeUsersForCsv(profiles);
    const csv = Papa.unparse({ fields: userCsvHeaders, data: rows });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 md:px-8 lg:px-12 py-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <div className="flex gap-3 items-center">
          <Input
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder="Search users by name, email, role, site"
          />
          <Button onClick={exportCsv}>Export CSV</Button>
          <button
            className="w-10 h-10 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 hover:bg-pink-500/30 flex items-center justify-center text-2xl font-semibold leading-none"
            onClick={() => setShowAddUserModal(true)}
            aria-label="Add User"
          >
            +
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading users…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-400">No users found.</p>
      ) : (
        <div className="overflow-x-auto border border-neutral-800 rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Position</th>
                <th className="text-left p-3">Site</th>
                <th className="text-left p-3">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-neutral-800">
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{p.full_name || p.email || "—"}</span>
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      <span className="font-medium">{p.full_name || "—"}</span>
                      <span className="text-slate-400 text-xs">{p.id}</span>
                    </div>
                  </td>
                  <td className="p-3">{p.email || "—"}</td>
                  <td className="p-3 capitalize">{p.role || "—"}</td>
                  <td className="p-3">{p.position_title || "—"}</td>
                  <td className="p-3">{(p.site_id && siteName[p.site_id]) || "Unassigned"}</td>
                  <td className="p-3">{p.last_login ? new Date(p.last_login).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddUserModal && (
        <AddUserModal
          open={showAddUserModal}
          onClose={() => {
            setShowAddUserModal(false);
          }}
          companyId={companyId as string}
          selectedSiteId={siteId ?? null}
          onRefresh={loadUsers}
        />
      )}
    </div>
  );
}