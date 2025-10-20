interface EntityCardProps {
  title: React.ReactNode;
  rightActions?: React.ReactNode;
  children?: React.ReactNode;
  onHeaderClick?: () => void;
}

export default function EntityCard({
  title,
  rightActions,
  onHeaderClick,
  children,
}: EntityCardProps) {
  return (
    <div 
      className="
        group relative rounded-xl
        bg-[#111827] text-white
        border border-[#1F2937]
        transition-colors transition-shadow duration-150
        hover:border-[#EC4899]
        hover:shadow-[0_0_0_1px_rgba(236,72,153,0.55),0_0_12px_rgba(236,72,153,0.35)]
      "
    >
      <div
        className="flex justify-between items-center px-4 py-3 cursor-pointer select-none"
        onClick={onHeaderClick}
      >
        <div className="flex flex-col gap-0.5 truncate">{title}</div>

        {/* rightActions (chevron only) */}
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {rightActions}
        </div>
      </div>

      {children && <div className="px-4 pb-3 border-t border-[#1F2937]">{children}</div>}
    </div>
  );
}