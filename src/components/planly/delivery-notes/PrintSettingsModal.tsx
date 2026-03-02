'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PrintSettings, defaultPrintSettings } from './DeliveryNoteSheet';

const STORAGE_KEY = 'planly-delivery-note-settings';

interface PrintSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: PrintSettings;
  onSave: (settings: PrintSettings) => void;
}

export function PrintSettingsModal({
  open,
  onClose,
  settings,
  onSave,
}: PrintSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<PrintSettings>(settings);

  // Reset local settings when modal opens
  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleSave = () => {
    onSave(localSettings);
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localSettings));
    } catch (e) {
      console.error('Failed to save print settings:', e);
    }
    onClose();
  };

  const handlePaperSizeChange = (paperSize: PrintSettings['paperSize']) => {
    const notesPerPage = paperSize === 'A5' ? 2 : paperSize === 'A4' ? 4 : localSettings.notesPerPage;
    setLocalSettings(prev => ({
      ...prev,
      paperSize,
      notesPerPage: notesPerPage as 1 | 2 | 4,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Print Settings</DialogTitle>
          <DialogDescription>
            Configure how delivery notes are printed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Paper Size */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-theme-secondary">
              Paper Size
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paperSize"
                  checked={localSettings.paperSize === 'A4'}
                  onChange={() => handlePaperSizeChange('A4')}
                  className="w-4 h-4 text-module-fg focus:ring-module-fg"
                />
                <span className="text-sm text-theme-secondary">
                  A4 (4 notes per sheet)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paperSize"
                  checked={localSettings.paperSize === 'A5'}
                  onChange={() => handlePaperSizeChange('A5')}
                  className="w-4 h-4 text-module-fg focus:ring-module-fg"
                />
                <span className="text-sm text-theme-secondary">
                  A5 (2 notes per sheet)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paperSize"
                  checked={localSettings.paperSize === 'custom'}
                  onChange={() => handlePaperSizeChange('custom')}
                  className="w-4 h-4 text-module-fg focus:ring-module-fg"
                />
                <span className="text-sm text-theme-secondary">
                  Custom
                </span>
              </label>
            </div>

            {/* Custom dimensions */}
            {localSettings.paperSize === 'custom' && (
              <div className="pl-7 space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-theme-tertiary w-16">Width:</label>
                  <Input
                    type="number"
                    value={localSettings.customWidth || 210}
                    onChange={(e) => setLocalSettings(prev => ({
                      ...prev,
                      customWidth: parseInt(e.target.value) || 210,
                    }))}
                    className="w-20 h-8 text-sm"
                    min={100}
                    max={500}
                  />
                  <span className="text-xs text-theme-tertiary">mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-theme-tertiary w-16">Height:</label>
                  <Input
                    type="number"
                    value={localSettings.customHeight || 297}
                    onChange={(e) => setLocalSettings(prev => ({
                      ...prev,
                      customHeight: parseInt(e.target.value) || 297,
                    }))}
                    className="w-20 h-8 text-sm"
                    min={100}
                    max={500}
                  />
                  <span className="text-xs text-theme-tertiary">mm</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-theme-tertiary w-16">Notes:</label>
                  <select
                    value={localSettings.notesPerPage}
                    onChange={(e) => setLocalSettings(prev => ({
                      ...prev,
                      notesPerPage: parseInt(e.target.value) as 1 | 2 | 4,
                    }))}
                    className="w-20 h-8 text-sm rounded border border-theme bg-theme-surface text-theme-primary"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </select>
                  <span className="text-xs text-theme-tertiary">per page</span>
                </div>
              </div>
            )}
          </div>

          {/* Print Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-theme-secondary">
              Print Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showCuttingMarkers}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    showCuttingMarkers: e.target.checked,
                  }))}
                  className="w-4 h-4 rounded text-module-fg focus:ring-module-fg"
                />
                <span className="text-sm text-theme-secondary">
                  Show cutting markers
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showAllProducts}
                  onChange={(e) => setLocalSettings(prev => ({
                    ...prev,
                    showAllProducts: e.target.checked,
                  }))}
                  className="w-4 h-4 rounded text-module-fg focus:ring-module-fg"
                />
                <span className="text-sm text-theme-secondary">
                  Show all products (include items with no quantity)
                </span>
              </label>
            </div>
          </div>

          {/* Orientation Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Print orientation is set to Landscape. If your printer dialog shows Portrait, please change it to Landscape for correct output.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-module-fg hover:bg-module-fg/80 text-white"
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to load settings from localStorage
export function loadPrintSettings(): PrintSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPrintSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load print settings:', e);
  }
  return defaultPrintSettings;
}
