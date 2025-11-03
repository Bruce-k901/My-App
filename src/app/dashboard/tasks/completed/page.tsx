"use client";

export default function CompletedTasksPage() {
  return (
    <div className="bg-[#0f1220] text-white border border-neutral-800 rounded-xl p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Completed Tasks</h1>
        <p className="text-white/60">View all completed task records</p>
      </div>

      {/* Empty State */}
      <div className="mt-8">
        <p className="text-white/60">No completed tasks yet</p>
      </div>
    </div>
  );
}
