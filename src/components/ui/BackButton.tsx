'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string; // Optional explicit path
  label?: string; // Optional label (default: "Back")
}

export default function BackButton({ href, label = "Back" }: BackButtonProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };
  
  return (
    <button
      onClick={handleBack}
      className="
        flex items-center gap-2 
        px-4 py-2 
        text-magenta-400 
        border border-magenta-500/30 
        rounded-lg 
        hover:bg-magenta-500/10 
        hover:border-magenta-400 
        hover:shadow-[0_0_12px_rgba(236,72,153,0.3)]
        transition-all duration-200
      "
    >
      <ChevronLeft size={18} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

