"use client";

import React from "react";

type Site = {
  id?: string;
  name: string;
  nickname?: string;
  address?: string;
  active: boolean;
};

type SiteListProps = {
  sites: Site[];
  onEdit: (site: Site) => void;
  onDelete: (site: Site) => void;
};

export default function SiteList({ sites, onEdit, onDelete }: SiteListProps) {
  if (!sites || sites.length === 0) {
    return <p className="text-slate-300">No sites yet. Click "Add Site" to create one.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sites.map((s) => (
        <div key={s.id || s.name} className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{s.name}</h3>
            {s.nickname && s.nickname !== s.name && (
              <p className="text-sm text-slate-300">Nickname: {s.nickname}</p>
            )}
          </div>
          {s.address && <p className="text-sm text-slate-200">Address: {s.address}</p>}
          <p className="text-sm {s.active ? 'text-green-300' : 'text-slate-300'}">Active: {s.active ? "Yes" : "No"}</p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onEdit(s)}
              className="px-3 py-2 rounded-md text-white border border-white/20 bg-white/10 hover:bg-white/20"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(s)}
              className="px-3 py-2 rounded-md text-red-300 border border-white/20 bg-white/10 hover:bg-white/20"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}