'use client';

import CardChevron from './CardChevron';

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  onToggle?: () => void;
  expanded?: boolean;
  className?: string;
}

export default function CardHeader({
  title,
  subtitle,
  showChevron = false,
  onToggle,
  expanded = false,
  className = "",
}: CardHeaderProps) {
  return (
    <div 
      className={`flex justify-between items-center px-4 py-3 cursor-pointer select-none ${className}`}
      onClick={onToggle}
    >
      <div className="flex flex-col gap-0.5 truncate flex-1">
        <div className="text-lg font-semibold text-white">{title}</div>
        {subtitle && (
          <div className="text-sm text-gray-400">{subtitle}</div>
        )}
      </div>

      {showChevron && onToggle && (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <CardChevron isOpen={expanded} onToggle={onToggle} />
        </div>
      )}
    </div>
  );
}