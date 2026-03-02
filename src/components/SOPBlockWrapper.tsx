import { X } from '@/components/ui/icons';

interface SOPBlockWrapperProps {
  node: any;
  deleteNode: () => void;
  children: React.ReactNode;
  nonDeletable?: boolean;
}

export default function SOPBlockWrapper({ node, deleteNode, children, nonDeletable = false }: SOPBlockWrapperProps) {
  const deletable = !nonDeletable && !["prepHeader", "sopComplianceCheck"].includes(node.type);

  return (
    <div className="relative sop-block group">
      {children}
      {deletable && (
        <button
          onClick={deleteNode}
          className="absolute bottom-2 right-2 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full border border-magenta-400/50 bg-neutral-900/80 text-magenta-400 hover:bg-magenta-500/20 hover:border-magenta-400 transition-all shadow-lg backdrop-blur-sm"
          title="Remove block"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
