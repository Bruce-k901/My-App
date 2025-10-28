"use client";

export default function ScheduledTasksPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2">Scheduled Tasks</h1>
        <p className="text-neutral-300 text-sm">View and manage your upcoming compliance tasks</p>
      </div>
      <div className="bg-neutral-800/50 rounded-xl p-12 text-center border border-neutral-700">
        <p className="text-neutral-400">Scheduled tasks will appear here</p>
      </div>
    </div>
  );
}

