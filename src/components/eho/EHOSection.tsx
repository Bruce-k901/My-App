import React from "react";

export function EHOSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5 text-pink-400" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}