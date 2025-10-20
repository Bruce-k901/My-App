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
          <div className="text-sm text-gray-400 flex gap-1 items-center">
            {subtitle.split(' • ').map((part, index, array) => {
              const trimmedPart = part.trim();
              
              // Check if this part looks like an email
              if (trimmedPart.includes('@') && trimmedPart.includes('.')) {
                return (
                  <span key={index}>
                    <a
                      href={`mailto:${trimmedPart}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-pink-400 transition-colors duration-200"
                    >
                      {trimmedPart}
                    </a>
                    {index < array.length - 1 && <span className="mx-1">•</span>}
                  </span>
                );
              }
              
              // Check if this part looks like a phone number (contains digits and common phone chars)
              if (/^[\d\s\-\+\(\)]+$/.test(trimmedPart) && trimmedPart.length >= 7) {
                return (
                  <span key={index}>
                    <a
                      href={`tel:${trimmedPart}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-pink-400 transition-colors duration-200"
                    >
                      {trimmedPart}
                    </a>
                    {index < array.length - 1 && <span className="mx-1">•</span>}
                  </span>
                );
              }
              
              // Regular text (like site name)
              return (
                <span key={index}>
                  {trimmedPart}
                  {index < array.length - 1 && <span className="mx-1">•</span>}
                </span>
              );
            })}
          </div>
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