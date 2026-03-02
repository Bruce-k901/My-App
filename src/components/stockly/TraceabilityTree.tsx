// @salsa - SALSA Compliance: Visual trace tree component
'use client';

import { Building2, Layers, Package, Users, AlertTriangle } from '@/components/ui/icons';
import { allergenKeyToLabel } from '@/lib/stockly/allergens';
import type { TraceNode, TraceLink } from '@/lib/types/stockly';

interface TraceabilityTreeProps {
  nodes: TraceNode[];
  links: TraceLink[];
  direction: 'forward' | 'backward';
}

// @salsa — Node type config
const NODE_CONFIG: Record<TraceNode['type'], { icon: React.ElementType; bgClass: string; borderClass: string; labelClass: string }> = {
  supplier: {
    icon: Building2,
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    labelClass: 'text-blue-700 dark:text-blue-400',
  },
  raw_material_batch: {
    icon: Package,
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    borderClass: 'border-amber-200 dark:border-amber-800',
    labelClass: 'text-amber-700 dark:text-amber-400',
  },
  production_batch: {
    icon: Layers,
    bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    borderClass: 'border-purple-200 dark:border-purple-800',
    labelClass: 'text-purple-700 dark:text-purple-400',
  },
  finished_product_batch: {
    icon: Package,
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    labelClass: 'text-emerald-700 dark:text-emerald-400',
  },
  customer: {
    icon: Users,
    bgClass: 'bg-rose-50 dark:bg-rose-900/20',
    borderClass: 'border-rose-200 dark:border-rose-800',
    labelClass: 'text-rose-700 dark:text-rose-400',
  },
};

const TYPE_LABELS: Record<TraceNode['type'], string> = {
  supplier: 'Supplier',
  raw_material_batch: 'Raw Material',
  production_batch: 'Production',
  finished_product_batch: 'Finished Product',
  customer: 'Customer',
};

function TraceNodeCard({ node }: { node: TraceNode }) {
  const config = NODE_CONFIG[node.type];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border-2 ${config.borderClass} ${config.bgClass} p-3 min-w-[180px] max-w-[220px] shadow-sm`}>
      {/* Type label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${config.labelClass}`} />
        <span className={`text-xs font-medium uppercase ${config.labelClass}`}>
          {TYPE_LABELS[node.type]}
        </span>
      </div>

      {/* Main label */}
      <p className="font-mono font-bold text-sm text-theme-primary truncate">{node.label}</p>
      {node.sublabel && (
        <p className="text-xs text-theme-secondary mt-0.5 truncate">{node.sublabel}</p>
      )}

      {/* Details */}
      <div className="mt-2 space-y-1">
        {node.quantity !== undefined && (
          <p className="text-xs text-theme-secondary">
            {node.quantity} {node.unit || 'units'}
          </p>
        )}
        {node.date && (
          <p className="text-xs text-theme-tertiary">
            {new Date(node.date).toLocaleDateString('en-GB')}
          </p>
        )}
        {node.status && node.type !== 'supplier' && (
          <span className={`inline-block text-xs px-1.5 py-0.5 rounded capitalize ${
            node.status === 'active' || node.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
            node.status === 'recalled' || node.status === 'quarantined' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
            'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {node.status}
          </span>
        )}
      </div>

      {/* Allergens */}
      {node.allergens && node.allergens.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5" />
          {node.allergens.slice(0, 3).map((a) => (
            <span key={a} className="text-[10px] px-1 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
              {allergenKeyToLabel(a)}
            </span>
          ))}
          {node.allergens.length > 3 && (
            <span className="text-[10px] text-red-500">+{node.allergens.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function TraceabilityTree({ nodes, links, direction }: TraceabilityTreeProps) {
  if (nodes.length === 0) return null;

  // Group nodes into columns by type (in trace order)
  const typeOrder: TraceNode['type'][] = direction === 'forward'
    ? ['supplier', 'raw_material_batch', 'production_batch', 'finished_product_batch', 'customer']
    : ['customer', 'finished_product_batch', 'production_batch', 'raw_material_batch', 'supplier'];

  const columns: { type: TraceNode['type']; nodes: TraceNode[] }[] = [];

  for (const type of typeOrder) {
    const typeNodes = nodes.filter(n => n.type === type);
    if (typeNodes.length > 0) {
      columns.push({ type, nodes: typeNodes });
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-2 min-w-max py-4">
        {columns.map((col, colIdx) => (
          <div key={col.type} className="flex items-start gap-2">
            {/* Column of nodes */}
            <div className="flex flex-col gap-3">
              {col.nodes.map((node) => (
                <TraceNodeCard key={node.id} node={node} />
              ))}
            </div>

            {/* Connector arrow between columns */}
            {colIdx < columns.length - 1 && (
              <div className="flex items-center self-center px-1">
                <div className="w-8 h-0.5 bg-theme-border" />
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-theme-border" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Print-friendly table view */}
      <div className="hidden print:block mt-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Code/Name</th>
              <th className="text-left py-2 px-2">Description</th>
              <th className="text-left py-2 px-2">Quantity</th>
              <th className="text-left py-2 px-2">Date</th>
              <th className="text-left py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.id} className="border-b border-gray-200">
                <td className="py-1.5 px-2 capitalize">{TYPE_LABELS[node.type]}</td>
                <td className="py-1.5 px-2 font-mono">{node.label}</td>
                <td className="py-1.5 px-2">{node.sublabel || '-'}</td>
                <td className="py-1.5 px-2">{node.quantity ? `${node.quantity} ${node.unit || ''}` : '-'}</td>
                <td className="py-1.5 px-2">{node.date ? new Date(node.date).toLocaleDateString('en-GB') : '-'}</td>
                <td className="py-1.5 px-2 capitalize">{node.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
