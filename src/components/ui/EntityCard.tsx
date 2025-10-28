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
        bg-white/[0.05] border border-white/[0.1] rounded-xl p-3
        transition-all duration-150 ease-in-out
        hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]
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

      {children && <div className="px-4 pb-3 border-t border-white/[0.1]">{children}</div>}
    </div>
  );
}