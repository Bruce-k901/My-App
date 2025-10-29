"use client";
import React from "react";

export default function ComplianceTemplatesPage() {
  return (
    <section className="w-full min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Compliance Templates</h1>
        <p className="text-slate-400 text-sm">SFBB (Safer Food Better Business) compliance task templates and library</p>
      </div>

      {/* Content */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2 text-white">SFBB Library</h2>
          <p className="text-slate-400 text-sm mb-4">
            Pre-built compliance templates for food safety and hygiene regulations. 
            These templates help you maintain SFBB compliance across your sites.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <h3 className="font-medium text-white mb-1">Safe Methods</h3>
            <p className="text-sm text-slate-400">SFBB safe methods documentation and procedures</p>
          </div>
          
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <h3 className="font-medium text-white mb-1">Temperature Records</h3>
            <p className="text-sm text-slate-400">Fridge and freezer temperature logging templates</p>
          </div>
          
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <h3 className="font-medium text-white mb-1">Maintenance Logs</h3>
            <p className="text-sm text-slate-400">Equipment maintenance and service record templates</p>
          </div>
          
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <h3 className="font-medium text-white mb-1">Delivery Records</h3>
            <p className="text-sm text-slate-400">Goods received and delivery verification checklists</p>
          </div>
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-200">
            💡 <strong>Tip:</strong> These templates are based on SFBB requirements and can be customized for your specific needs.
          </p>
        </div>
      </div>
    </section>
  );
}
