"use client";

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronRight } from '@/components/ui/icons';

type Props = {
  sites: any[];
  onEdit: (site: any) => void;
  onDelete: (site: any) => void;
};

export default function SiteList({ sites, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="min-w-full divide-y divide-neutral-800">
        <thead className="bg-white/[0.04]">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">\u00A0</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Name</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Type</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">City</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Region</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Status</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {(sites || []).map((s) => (
            <>
              <tr key={s.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2 text-sm">
                  <button
                    className="p-1 rounded hover:bg-white/[0.08] border border-transparent hover:border-white/[0.12]"
                    onClick={() => toggle(s.id)}
                    aria-label={expanded[s.id] ? "Collapse" : "Expand"}
                  >
                    {expanded[s.id] ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                  </button>
                </td>
                <td className="px-4 py-2 text-sm text-white">{s.name || "—"}</td>
                <td className="px-4 py-2 text-sm text-slate-300">—</td>
                <td className="px-4 py-2 text-sm text-slate-300">{s.city || "—"}</td>
                <td className="px-4 py-2 text-sm text-slate-300">{s.region || "—"}</td>
                <td className="px-4 py-2 text-sm text-slate-300">{s.status || "—"}</td>
                <td className="px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] text-xs flex items-center gap-1"
                      onClick={() => onEdit(s)}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      className="px-3 py-1.5 rounded bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] text-xs flex items-center gap-1"
                      onClick={() => onDelete(s)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
              {expanded[s.id] && (
                <tr>
                  <td className="px-4 py-3" colSpan={7}>
                    <div className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400">Address</p>
                          <p className="text-white">{[s.address_line1, s.address_line2].filter(Boolean).join(", ") || "—"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">City / Postcode</p>
                          <p className="text-white">{[s.city, s.postcode].filter(Boolean).join(" ") || "—"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Region</p>
                          <p className="text-white">{s.region || "—"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Type</p>
                          <p className="text-white">—</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Region</p>
                          <p className="text-white">{s.region || "—"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Floor Area</p>
                          <p className="text-white">—</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Opening Date</p>
                          <p className="text-white">—</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Contact</p>
                          <p className="text-white">—</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-1.5 rounded bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] text-xs"
                          onClick={() => onEdit(s)}
                        >
                          Edit Details
                        </button>
                        <button
                          className="px-3 py-1.5 rounded bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.14] text-xs"
                          onClick={() => onDelete(s)}
                        >
                          Delete Site
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      {(!sites || sites.length === 0) && (
        <div className="p-4 text-slate-400">No sites found.</div>
      )}
    </div>
  );
}