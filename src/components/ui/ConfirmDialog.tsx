'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from '@/components/ui/icons';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default'
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose(); // Close dialog after confirming
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-theme-primary flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {typeof description === 'string' ? (
            <p className="text-theme-secondary">{description}</p>
          ) : (
            <div className="text-theme-secondary">{description}</div>
          )}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-300 dark:border-white/[0.12] text-theme-secondary hover:bg-gray-100 dark:hover:bg-white/[0.05]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            className={variant === 'destructive'
              ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-500/90 dark:hover:bg-orange-500 text-white'
              : 'bg-[#D37E91] hover:bg-[#D37E91]/90 text-white'
            }
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
