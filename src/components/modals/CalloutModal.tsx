'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface CalloutModalProps {
  open: boolean;
  onClose: () => void;
  assetId?: string;
  assetName?: string;
}

export default function CalloutModal({ open, onClose, assetId, assetName }: CalloutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            Log Callout
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-8 text-center">
          <div className="text-neutral-400 text-lg mb-4">
            Callout modal – under construction
          </div>
          {assetName && (
            <div className="text-sm text-neutral-500">
              For asset: {assetName}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}