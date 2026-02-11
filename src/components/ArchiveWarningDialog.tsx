"use client";

import React from 'react';
import { AlertTriangle, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';

interface ArchiveWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: 'ingredient' | 'recipe' | 'sop';
  itemName: string;
  affectedItems?: {
    recipes?: { id: string; name: string }[];
    sops?: { id: string; title: string }[];
  };
}

export function ArchiveWarningDialog({
  open,
  onClose,
  onConfirm,
  itemType,
  itemName,
  affectedItems,
}: ArchiveWarningDialogProps) {
  if (!open) return null;

  const hasAffectedItems =
    (affectedItems?.recipes && affectedItems.recipes.length > 0) ||
    (affectedItems?.sops && affectedItems.sops.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Archive {itemType}?
            </h3>
            <p className="text-white/60 mb-4">
              You are about to archive <strong className="text-white">{itemName}</strong>.
            </p>
            
            {hasAffectedItems && (
              <div className="mb-4 space-y-3">
                <p className="text-amber-400 font-medium text-sm">
                  This will affect the following items:
                </p>
                
                {affectedItems?.recipes && affectedItems.recipes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-white/60 mb-2">
                      Recipes ({affectedItems.recipes.length}):
                    </p>
                    <ul className="text-sm space-y-1 ml-4">
                      {affectedItems.recipes.map(recipe => (
                        <li key={recipe.id} className="text-white/80 list-disc">
                          {recipe.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {affectedItems?.sops && affectedItems.sops.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-white/60 mb-2">
                      SOPs ({affectedItems.sops.length}):
                    </p>
                    <ul className="text-sm space-y-1 ml-4">
                      {affectedItems.sops.map(sop => (
                        <li key={sop.id} className="text-white/80 list-disc">
                          {sop.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-6">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Archive {itemType}
              </Button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

