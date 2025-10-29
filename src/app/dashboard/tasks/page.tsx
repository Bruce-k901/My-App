"use client";

export default function MyTasksPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Tasks</h1>
        <p className="text-white/60">View and manage your assigned tasks</p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">My Tasks</h2>
          <p className="text-white/60 max-w-md mx-auto">
            This page will display all tasks assigned to you. Functionality coming soon in Phase 1 of the development pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
