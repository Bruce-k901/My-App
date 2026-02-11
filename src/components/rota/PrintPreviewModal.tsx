'use client';

import { X, Printer } from '@/components/ui/icons';
import { useEffect, useRef } from 'react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  children: React.ReactNode;
}

export function PrintPreviewModal({
  isOpen,
  onClose,
  onPrint,
  children
}: PrintPreviewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    onPrint();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col h-[90vh] w-[95vw] max-w-7xl bg-[#0B0D13] border border-white/[0.06] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-[#D37E91]" />
            <h2 className="text-xl font-semibold text-white">Print Preview</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all duration-200 ease-in-out flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-white p-8">
          <div ref={contentRef} className="bg-white text-black">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.06] bg-white/[0.03] flex items-center justify-between">
          <p className="text-sm text-white/60">
            Review the preview above. Click Print to send to your printer.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/80 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-transparent border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)] transition-all duration-200 ease-in-out"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

