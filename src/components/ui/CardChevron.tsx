import { ChevronDown, ChevronUp } from '@/components/ui/icons';

interface CardChevronProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function CardChevron({ isOpen, onToggle }: CardChevronProps) {
  return (
    <div
      onClick={onToggle}
      role="button"
      aria-label="Toggle site details"
      tabIndex={0}
      className="p-1 rounded text-accent transition hover:shadow-magentaSm cursor-pointer"
    >
      {isOpen ? <ChevronUp size={18} strokeWidth={2.2}/> : <ChevronDown size={18} strokeWidth={2.2}/>}
    </div>
  );
}