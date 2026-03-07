'use client';

import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Calendar, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  list_price: number;
}

interface CustomerPrice {
  id: string;
  product_id: string;
  unit_price: number;
  effective_to: string | null;
}

interface PriceChange {
  product_id: string;
  unit_price: number | null;
  effective_to: string | null;
  no_expiry: boolean;
}

interface PricingGridProps {
  customerId: string;
  products: Product[];
  customerPrices: CustomerPrice[];
  onSave: (prices: PriceChange[]) => Promise<void>;
  isSaving: boolean;
}

export function PricingGrid({
  customerId,
  products,
  customerPrices,
  onSave,
  isSaving,
}: PricingGridProps) {
  const [changes, setChanges] = useState<Record<string, PriceChange>>({});
  const [bulkDate, setBulkDate] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');

  // Map existing pricing by product_id
  const existingPricesMap = useMemo(() => {
    const map: Record<string, CustomerPrice> = {};
    for (const price of customerPrices) {
      map[price.product_id] = price;
    }
    return map;
  }, [customerPrices]);

  // Get effective value for a product (change takes precedence over existing)
  const getEffectiveValue = useCallback(
    (productId: string) => {
      const change = changes[productId];
      const existing = existingPricesMap[productId];

      if (change !== undefined) {
        return {
          unit_price: change.unit_price,
          effective_to: change.effective_to,
          no_expiry: change.no_expiry,
        };
      }

      if (existing) {
        return {
          unit_price: existing.unit_price,
          effective_to: existing.effective_to,
          no_expiry: !existing.effective_to,
        };
      }

      return {
        unit_price: null,
        effective_to: null,
        no_expiry: false,
      };
    },
    [changes, existingPricesMap]
  );

  const handlePriceChange = (productId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    const current = getEffectiveValue(productId);

    setChanges((prev) => ({
      ...prev,
      [productId]: {
        product_id: productId,
        unit_price: numValue,
        effective_to: current.effective_to,
        no_expiry: current.no_expiry,
      },
    }));
  };

  const handleDateChange = (productId: string, value: string) => {
    const current = getEffectiveValue(productId);

    setChanges((prev) => ({
      ...prev,
      [productId]: {
        product_id: productId,
        unit_price: current.unit_price,
        effective_to: value || null,
        no_expiry: !value,
      },
    }));
  };

  const handleNoExpiryChange = (productId: string, checked: boolean) => {
    const current = getEffectiveValue(productId);

    setChanges((prev) => ({
      ...prev,
      [productId]: {
        product_id: productId,
        unit_price: current.unit_price,
        effective_to: checked ? null : current.effective_to,
        no_expiry: checked,
      },
    }));
  };

  const handleClearPrice = (productId: string) => {
    setChanges((prev) => ({
      ...prev,
      [productId]: {
        product_id: productId,
        unit_price: null,
        effective_to: null,
        no_expiry: false,
      },
    }));
  };

  const handleSave = async () => {
    // Build complete price list from changes + existing
    const allPrices: PriceChange[] = products.map((product) => {
      const effective = getEffectiveValue(product.id);
      return {
        product_id: product.id,
        unit_price: effective.unit_price,
        effective_to: effective.no_expiry ? null : effective.effective_to,
        no_expiry: effective.no_expiry,
      };
    });

    await onSave(allPrices);
    setChanges({});
  };

  const handleClearAll = async () => {
    if (!confirm('Remove all custom pricing for this customer?')) return;

    // Set all prices to null
    const clearedPrices: PriceChange[] = products.map((product) => ({
      product_id: product.id,
      unit_price: null,
      effective_to: null,
      no_expiry: false,
    }));

    await onSave(clearedPrices);
    setChanges({});
  };

  // Apply bulk date to all products with custom prices
  const applyBulkDate = () => {
    if (!bulkDate) {
      toast.error('Please select a date first');
      return;
    }

    const newChanges: Record<string, PriceChange> = { ...changes };
    let appliedCount = 0;

    for (const product of products) {
      const effective = getEffectiveValue(product.id);
      // Only apply to products that have a custom price set
      if (effective.unit_price !== null && effective.unit_price > 0) {
        newChanges[product.id] = {
          product_id: product.id,
          unit_price: effective.unit_price,
          effective_to: bulkDate,
          no_expiry: false,
        };
        appliedCount++;
      }
    }

    if (appliedCount === 0) {
      toast.info('No custom prices to apply date to');
      return;
    }

    setChanges(newChanges);
    toast.success(`Applied date to ${appliedCount} products`);
  };

  // Apply no-expiry to all products with custom prices
  const applyBulkNoExpiry = () => {
    const newChanges: Record<string, PriceChange> = { ...changes };
    let appliedCount = 0;

    for (const product of products) {
      const effective = getEffectiveValue(product.id);
      // Only apply to products that have a custom price set
      if (effective.unit_price !== null && effective.unit_price > 0) {
        newChanges[product.id] = {
          product_id: product.id,
          unit_price: effective.unit_price,
          effective_to: null,
          no_expiry: true,
        };
        appliedCount++;
      }
    }

    if (appliedCount === 0) {
      toast.info('No custom prices to update');
      return;
    }

    setChanges(newChanges);
    toast.success(`Set no-expiry for ${appliedCount} products`);
  };

  // Apply discount percentage to all products
  const applyBulkDiscount = () => {
    const percent = parseFloat(discountPercent);
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      toast.error('Please enter a valid discount percentage (1-100)');
      return;
    }

    const newChanges: Record<string, PriceChange> = { ...changes };
    let appliedCount = 0;

    for (const product of products) {
      if (product.list_price > 0) {
        const discountedPrice = Math.round((product.list_price * (1 - percent / 100)) * 100) / 100;
        newChanges[product.id] = {
          product_id: product.id,
          unit_price: discountedPrice,
          effective_to: bulkDate || null,
          no_expiry: !bulkDate,
        };
        appliedCount++;
      }
    }

    if (appliedCount === 0) {
      toast.info('No products with list prices to discount');
      return;
    }

    setChanges(newChanges);
    toast.success(`Applied ${percent}% discount to ${appliedCount} products`);
  };

  const hasChanges = Object.keys(changes).length > 0;
  const hasAnyCustomPrices = customerPrices.length > 0 || hasChanges;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Bulk Controls */}
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.02] border border-theme space-y-3">
        {/* Discount Row */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-theme-secondary whitespace-nowrap w-28">
            Bulk discount:
          </span>
          <div className="relative w-24">
            <Input
              type="number"
              min="0"
              max="100"
              step="1"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="0"
              className="pr-7 h-9 text-sm text-right"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-theme-tertiary">
              %
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyBulkDiscount}
            disabled={!discountPercent}
            className="bg-module-fg hover:bg-module-fg/90 border-module-fg text-white"
          >
            Apply Discount
          </Button>
          <span className="text-xs text-theme-tertiary">
            Calculates custom price from list price
          </span>
        </div>

        {/* Date Row */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-theme-secondary whitespace-nowrap w-28">
            Expiry date:
          </span>
          <div className="relative w-[180px]">
            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-tertiary" />
            <Input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="pl-8 h-9 text-sm"
              placeholder="Select date"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyBulkDate}
            disabled={!bulkDate}
            className="bg-theme-surface border-theme text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.06]"
          >
            Set Date
          </Button>
          <div className="h-6 w-px bg-gray-200 dark:bg-white/[0.06]" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={applyBulkNoExpiry}
            className="bg-theme-surface border-theme text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.06]"
          >
            Set No Expiry
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-theme bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-theme">
                <th className="px-3 py-2 text-left text-sm font-medium text-theme-secondary">
                  Product
                </th>
                <th className="px-3 py-2 text-right text-sm font-medium text-theme-secondary w-24">
                  List
                </th>
                <th className="px-3 py-2 text-right text-sm font-medium text-theme-secondary w-28">
                  Custom
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium text-theme-secondary w-36">
                  Valid Until
                </th>
                <th className="px-3 py-2 text-center text-sm font-medium text-theme-secondary w-20">
                  No Expiry
                </th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {products.map((product) => {
                const effective = getEffectiveValue(product.id);
                const hasCustomPrice =
                  effective.unit_price !== null && effective.unit_price > 0;
                const isChanged = changes[product.id] !== undefined;

                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'hover:bg-theme-surface-elevated/50 dark:hover:bg-white/[0.01] transition-colors',
                      isChanged && 'bg-amber-50/50 dark:bg-amber-500/5'
                    )}
                  >
                    <td className="px-3 py-2 text-sm font-medium text-theme-primary">
                      {product.name}
                    </td>

                    <td className="px-3 py-2 text-right text-sm text-theme-tertiary">
                      £{product.list_price.toFixed(2)}
                    </td>

                    <td className="px-2 py-1.5">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-theme-tertiary">
                          £
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="-"
                          value={effective.unit_price ?? ''}
                          onChange={(e) =>
                            handlePriceChange(product.id, e.target.value)
                          }
                          className="pl-5 text-right h-8 text-sm"
                        />
                      </div>
                    </td>

                    <td className="px-2 py-1.5">
                      {hasCustomPrice && !effective.no_expiry ? (
                        <div className="relative">
                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-tertiary" />
                          <Input
                            type="date"
                            value={effective.effective_to || ''}
                            onChange={(e) =>
                              handleDateChange(product.id, e.target.value)
                            }
                            min={format(new Date(), 'yyyy-MM-dd')}
                            className="pl-7 h-8 text-sm"
                          />
                        </div>
                      ) : (
                        <div className="text-center text-xs text-theme-tertiary/30">
                          {hasCustomPrice && effective.no_expiry
                            ? 'No expiry'
                            : '-'}
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-1.5">
                      {hasCustomPrice && (
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={effective.no_expiry}
                            onChange={(e) =>
                              handleNoExpiryChange(product.id, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-module-fg focus:ring-module-fg"
                          />
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-1.5">
                      {hasCustomPrice && (
                        <button
                          type="button"
                          onClick={() => handleClearPrice(product.id)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/[0.06] text-theme-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Clear custom price"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-theme-tertiary">
          {hasChanges && (
            <span className="text-amber-600 dark:text-amber-400">
              {Object.keys(changes).length} unsaved{' '}
              {Object.keys(changes).length === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={!hasAnyCustomPrices || isSaving}
            className="bg-gray-50 dark:bg-white/[0.03] border-theme text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            Clear All
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-module-fg hover:bg-module-fg/90 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
