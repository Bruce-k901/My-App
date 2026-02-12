import dynamic from 'next/dynamic';

interface UploadGlobalDocModalProps {
  onClose: () => void;
  onSuccess: (newDocId?: string) => void;
}

// Loading skeleton for Upload Modal
const UploadModalSkeleton = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-neutral-800 border border-theme rounded-xl p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-neutral-700 rounded w-32 animate-pulse"></div>
        <div className="h-6 w-6 bg-neutral-700 rounded animate-pulse"></div>
      </div>
      <div className="space-y-4">
        <div className="h-4 bg-neutral-700 rounded w-full animate-pulse"></div>
        <div className="h-32 bg-neutral-700 rounded w-full animate-pulse"></div>
        <div className="flex gap-2 justify-end">
          <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

// Dynamically import the actual UploadGlobalDocModal component
// Using a function that returns a promise to prevent caching issues
const DynamicUploadGlobalDocModal = dynamic(
  () => import('./UploadGlobalDocModal').then(mod => ({ default: mod.default })),
  {
    loading: () => <UploadModalSkeleton />,
    ssr: false,
  }
);

export default function LazyUploadGlobalDocModal(props: UploadGlobalDocModalProps) {
  return <DynamicUploadGlobalDocModal {...props} />;
}