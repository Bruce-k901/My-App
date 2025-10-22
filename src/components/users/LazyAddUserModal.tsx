import dynamic from 'next/dynamic';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  siteId?: string;
  selectedSiteId?: string;
  onRefresh: () => void;
}

// Loading skeleton for Add User Modal
const AddUserModalSkeleton = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-6 w-full max-w-lg">
      <div className="flex justify-between items-center mb-6">
        <div className="h-6 bg-neutral-700 rounded w-32 animate-pulse"></div>
        <div className="h-6 w-6 bg-neutral-700 rounded animate-pulse"></div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        </div>
        <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        <div className="h-10 bg-neutral-700 rounded animate-pulse"></div>
        <div className="flex gap-2 justify-end">
          <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
          <div className="h-10 bg-neutral-700 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

// Dynamically import the actual AddUserModal component
const DynamicAddUserModal = dynamic(
  () => import('./AddUserModal'),
  {
    loading: () => <AddUserModalSkeleton />,
    ssr: false,
  }
);

export default function LazyAddUserModal(props: AddUserModalProps) {
  // Only render if the modal should be open
  if (!props.open) {
    return null;
  }

  return <DynamicAddUserModal {...props} />;
}