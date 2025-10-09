"use client";

export default function DocumentsPoliciesSection() {
  return (
    <div className="space-y-4">
      <p className="text-slate-300">This section will support document uploads (policies, certificates) linked to your company. Storage integration will be added later.</p>
      <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] p-4">
        <div className="text-white font-semibold mb-2">Upload Area (Coming Soon)</div>
        <div className="flex items-center gap-3">
          <input type="file" disabled className="opacity-50 cursor-not-allowed" />
          <button disabled className="px-3 py-1.5 rounded bg-white/[0.08] border border-white/[0.12] text-white opacity-50 cursor-not-allowed">
            Upload
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="px-4 py-2 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]">Save</button>
        <button className="px-4 py-2 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12]">Save & Continue</button>
      </div>
    </div>
  );
}