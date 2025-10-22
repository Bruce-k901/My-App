'use client';

import dynamic from 'next/dynamic';
import { PPMAsset } from '@/types/ppm';

interface PPMDrawerProps {
  asset: PPMAsset | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

// Loading skeleton for PPM Drawer
const PPMDrawerSkeleton = () => (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
    <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-[#0b0d13]/95 border-l border-white/10 shadow-2xl">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-white/10 rounded w-48 animate-pulse"></div>
          <div className="h-6 w-6 bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="h-4 bg-white/10 rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-white/10 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-white/10 rounded w-24 animate-pulse"></div>
          <div className="h-10 bg-white/10 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-white/10 rounded w-36 animate-pulse"></div>
          <div className="h-20 bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

// Dynamically import the actual PPMDrawer component
const DynamicPPMDrawer = dynamic(
  () => import('./PPMDrawer'),
  {
    loading: () => <PPMDrawerSkeleton />,
    ssr: false, // Disable SSR for this component to reduce initial bundle
  }
);

export default function LazyPPMDrawer(props: PPMDrawerProps) {
  // Only render if the drawer should be open
  if (!props.open) {
    return null;
  }

  return <DynamicPPMDrawer {...props} />;
}