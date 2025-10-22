import dynamic from 'next/dynamic';

interface AddPPMModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  onPPMAdded: () => void;
}

// Loading skeleton for Add PPM Modal
const AddPPMModalSkeleton = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-6">
        <div className="h-6 bg-neutral-700 rounded w-32 animate-pulse"></div>
        <div className="h-6 w-6 bg-neutral-700 rounded animate-pulse"></div>
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        <div className="h-24 bg-neutral-700 rounded animate-pulse"></div>
        <div className="flex gap-2 justify-end">
          <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

// Dynamically import the actual AddPPMModal component
const DynamicAddPPMModal = dynamic(
  () => import('./AddPPMModal').then(mod => ({ default: mod.AddPPMModal })),
  {
    loading: () => <AddPPMModalSkeleton />,
    ssr: false,
  }
);

export default function LazyAddPPMModal(props: AddPPMModalProps) {
  // Only render if the modal should be open
  if (!props.isOpen) {
    return null;
  }

  return <DynamicAddPPMModal {...props} />;
}