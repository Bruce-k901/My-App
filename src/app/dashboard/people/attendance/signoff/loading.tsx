export default function AttendanceSignOffLoading() {
  return (
    <div className="min-h-screen bg-[rgb(var(--surface-elevated))] text-theme-primary p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-4 w-64 bg-white/[0.05] rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-white/[0.05] rounded animate-pulse" />
        </div>
        
        {/* Week nav skeleton */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-6 w-48 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-8 w-8 bg-white/[0.05] rounded animate-pulse" />
          </div>
        </div>
        
        {/* Day cards skeleton */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl mb-4">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-white/[0.05] rounded animate-pulse" />
                <div className="space-y-1">
                  <div className="h-5 w-24 bg-white/[0.05] rounded animate-pulse" />
                  <div className="h-4 w-32 bg-white/[0.05] rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-32 bg-white/[0.05] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

