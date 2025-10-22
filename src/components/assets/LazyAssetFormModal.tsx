import dynamic from 'next/dynamic';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset?: any;
}

// Loading skeleton for Asset Form Modal
const AssetFormModalSkeleton = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div className="h-6 bg-neutral-700 rounded w-40 animate-pulse"></div>
        <div className="h-6 w-6 bg-neutral-700 rounded animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-24 bg-neutral-700 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-6">
        <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
        <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
      </div>
    </div>
  </div>
);

// Dynamically import the actual AssetFormModal component
const DynamicAssetFormModal = dynamic(
  () => import('./AssetFormModal'),
  {
    loading: () => <AssetFormModalSkeleton />,
    ssr: false,
  }
);

export default function LazyAssetFormModal(props: AssetFormModalProps) {
  // Only render if the modal should be open
  if (!props.isOpen) {
    return null;
  }

  return <DynamicAssetFormModal {...props} />;
}