"use client";

export default function CreateLibraryPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create Library</h1>
        <p className="text-white/60">Create new library items</p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Create Library</h2>
          <p className="text-white/60 max-w-md mx-auto">
            This feature is under development and will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}
