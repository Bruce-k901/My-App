"use client";

export default function ActiveTasksPage() {
  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Active Tasks</h1>
        <p className="text-white/60">All active tasks from compliance and custom templates</p>
      </div>

      {/* Empty State */}
      <div className="mt-8">
        <p className="text-white/60">No active tasks yet</p>
      </div>
    </div>
  );
}
