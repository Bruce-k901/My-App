import { ChevronDown, ChevronUp } from "lucide-react";

interface CardChevronProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function CardChevron({ isOpen, onToggle }: CardChevronProps) {
  return (
    <button
    onClick={onToggle}
    className="
      p-1 rounded
      text-accent
      transition
      hover:shadow-magentaSm
    "
  >
      {isOpen ? <ChevronUp size={18} strokeWidth={2.2}/> : <ChevronDown size={18} strokeWidth={2.2}/>}
    </button>
  );
}