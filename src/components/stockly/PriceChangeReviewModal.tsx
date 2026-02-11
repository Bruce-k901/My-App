'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { AlertCircle, TrendingUp, TrendingDown, Info, Check } from '@/components/ui/icons';
import { PriceChange } from '@/lib/types/stockly';

interface PriceChangeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceChanges: PriceChange[];
  onConfirm: (approvedChanges: PriceChange[]) => void;
  loading?: boolean;
}

export function PriceChangeReviewModal({
  isOpen,
  onClose,
  priceChanges,
  onConfirm,
  loading = false,
}: PriceChangeReviewModalProps) {
  const [localChanges, setLocalChanges] = useState<PriceChange[]>(priceChanges);

  // Update local state when props change
  useEffect(() => {
    setLocalChanges(priceChanges);
  }, [priceChanges]);

  const toggleAcceptance = (ingredientId: string) => {
    setLocalChanges(prev =>
      prev.map(pc =>
        pc.ingredientId === ingredientId
          ? { ...pc, accepted: !pc.accepted }
          : pc
      )
    );
  };

  const acceptAll = () => {
    setLocalChanges(prev => prev.map(pc => ({ ...pc, accepted: true })));
  };

  const rejectAll = () => {
    setLocalChanges(prev => prev.map(pc => ({ ...pc, accepted: false })));
  };

  const acceptedCount = localChanges.filter(pc => pc.accepted).length;
  const rejectedCount = localChanges.filter(pc => !pc.accepted).length;
  const significantChanges = localChanges.filter(pc => pc.isSignificantChange);

  const formatCurrency = (amount: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  };

  const formatUnitCost = (amount: number) => {
    // For very small unit costs, show more decimals
    if (amount < 0.01) {
      return formatCurrency(amount, 6);
    } else if (amount < 1) {
      return formatCurrency(amount, 4);
    }
    return formatCurrency(amount, 2);
  };

  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0f1117] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-white">
            {significantChanges.length > 0 ? (
              <>
                <AlertCircle className="text-amber-400" size={24} />
                Price Changes Detected
              </>
            ) : (
              <>
                <Info className="text-blue-400" size={24} />
                Price Updates Detected
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Summary banner for significant changes */}
          {significantChanges.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                  <p className="font-medium text-amber-400 mb-1">
                    {significantChanges.length} Significant Price Change{significantChanges.length > 1 ? 's' : ''} (&gt;10%)
                  </p>
                  <p className="text-amber-300/80 text-xs">
                    Large price increases may indicate supplier price updates, invoice errors, or incorrect pack size extraction.
                    Please double-check the invoice before accepting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bulk actions */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="text-sm text-white/60">
              {localChanges.length} price change{localChanges.length > 1 ? 's' : ''} detected
              {acceptedCount > 0 && ` | ${acceptedCount} accepted`}
              {rejectedCount > 0 && ` | ${rejectedCount} rejected`}
            </div>
            <div className="flex gap-2">
              <Button onClick={acceptAll} variant="outline" size="sm">
                Accept All
              </Button>
              <Button onClick={rejectAll} variant="outline" size="sm">
                Reject All
              </Button>
            </div>
          </div>

          {/* Price change list */}
          <div className="space-y-3">
            {localChanges.map((change) => (
              <div
                key={change.ingredientId}
                className={`
                  bg-white/[0.03] border rounded-lg p-4 transition-all cursor-pointer
                  ${change.accepted
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-white/10'
                  }
                  ${change.isSignificantChange && change.accepted
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : ''
                  }
                `}
                onClick={() => toggleAcceptance(change.ingredientId)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                          ${change.accepted
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-white/30 bg-transparent'
                          }
                        `}
                      >
                        {change.accepted && <Check size={14} className="text-white" />}
                      </div>
                      <h3 className="font-medium text-white truncate">
                        {change.ingredientName}
                      </h3>
                      {change.isSignificantChange && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded border border-amber-500/30">
                          &gt;10%
                        </span>
                      )}
                    </div>

                    {/* Price comparison */}
                    <div className="grid grid-cols-2 gap-4 text-sm ml-7">
                      <div>
                        <div className="text-white/40 text-xs mb-1">Current</div>
                        <div className="text-white font-mono">
                          {formatUnitCost(change.currentUnitCost)}/unit
                        </div>
                        <div className="text-white/50 text-xs mt-0.5">
                          {formatCurrency(change.currentPackCost)} for {change.currentPackSize}g
                        </div>
                      </div>
                      <div>
                        <div className="text-white/40 text-xs mb-1">Invoice</div>
                        <div className="text-white font-mono">
                          {formatUnitCost(change.invoiceUnitCost)}/unit
                        </div>
                        <div className="text-white/50 text-xs mt-0.5">
                          {formatCurrency(change.invoiceUnitPrice)} for {change.invoicePackSize}g
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Change indicator */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`
                        flex items-center gap-1.5 text-sm font-medium mb-1
                        ${change.isPriceIncrease ? 'text-red-400' : 'text-green-400'}
                      `}
                    >
                      {change.isPriceIncrease ? (
                        <TrendingUp size={16} />
                      ) : (
                        <TrendingDown size={16} />
                      )}
                      {formatPercent(change.unitCostChangePercent)}
                    </div>
                    <div className="text-white/40 text-xs">
                      {change.isPriceIncrease ? '+' : ''}
                      {formatCurrency(Math.abs(change.packCostChange))}
                    </div>
                  </div>
                </div>

                {/* Optional: Recipe impact preview */}
                {change.affectedRecipes && change.affectedRecipes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 ml-7">
                    <div className="text-xs text-white/40 mb-2">
                      Affects {change.affectedRecipes.length} recipe{change.affectedRecipes.length > 1 ? 's' : ''}:
                    </div>
                    <div className="text-xs text-white/50 space-y-1">
                      {change.affectedRecipes.slice(0, 3).map(recipe => (
                        <div key={recipe.recipeId}>
                          {recipe.recipeName}: {formatCurrency(recipe.currentCost)} → {formatCurrency(recipe.newCost)}
                        </div>
                      ))}
                      {change.affectedRecipes.length > 3 && (
                        <div className="text-white/30">
                          + {change.affectedRecipes.length - 3} more...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          <Button onClick={onClose} variant="outline" disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {rejectedCount > 0 && (
              <div className="text-sm text-white/40">
                {rejectedCount} change{rejectedCount > 1 ? 's' : ''} will keep old price
              </div>
            )}
            <Button
              onClick={() => onConfirm(localChanges)}
              disabled={loading}
              variant="secondary"
            >
              {loading ? 'Confirming...' : `Confirm Delivery${acceptedCount > 0 ? ` & Update ${acceptedCount} Price${acceptedCount > 1 ? 's' : ''}` : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
