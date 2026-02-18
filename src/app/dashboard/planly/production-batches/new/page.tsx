// @salsa - SALSA Compliance: New production batch page
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import ProductionBatchForm from '@/components/planly/ProductionBatchForm';
import { ArrowLeft, Layers } from '@/components/ui/icons';

export default function NewProductionBatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultRecipeId = searchParams.get('recipeId') || undefined;
  const defaultDate = searchParams.get('date') || undefined;
  const defaultQuantity = searchParams.get('quantity') ? parseFloat(searchParams.get('quantity')!) : undefined;
  const defaultUnit = searchParams.get('unit') || undefined;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-theme-tertiary hover:text-theme-secondary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
          <Layers className="w-6 h-6 text-planly-dark dark:text-planly" />
          New Production Batch
        </h1>
        <p className="text-sm text-theme-tertiary mt-1">Create a new production run to track inputs, outputs, and CCP records</p>
      </div>

      <div className="bg-theme-bg-primary border border-theme-border rounded-lg p-6">
        <ProductionBatchForm
          onCreated={(batch) => router.push(`/dashboard/planly/production-batches/${batch.id}`)}
          defaultRecipeId={defaultRecipeId}
          defaultDate={defaultDate}
          defaultQuantity={defaultQuantity}
          defaultUnit={defaultUnit}
        />
      </div>
    </div>
  );
}
