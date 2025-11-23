export const TaskCardSkeleton = () => (
  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-white/10 rounded w-1/2"></div>
      </div>
      <div className="h-8 w-20 bg-white/10 rounded"></div>
    </div>
    <div className="flex gap-4 text-sm">
      <div className="h-4 bg-white/10 rounded w-24"></div>
      <div className="h-4 bg-white/10 rounded w-24"></div>
    </div>
  </div>
);

