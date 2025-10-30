"use client";

export default function MyRAsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Risk Assessments</h1>
        <p className="text-white/60">View and manage your risk assessments</p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Risk Assessments</h2>
          <p className="text-white/60 max-w-md mx-auto">
            This feature is under development and will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}
