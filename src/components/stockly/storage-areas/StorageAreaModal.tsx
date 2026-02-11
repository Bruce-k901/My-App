'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Label from '@/components/ui/Label';
import Textarea from '@/components/ui/Textarea';
import { StorageArea, STORAGE_DIVISIONS } from '@/lib/types/stockly';
import { Loader2 } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';

interface StorageAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingArea: StorageArea | null;
}

export default function StorageAreaModal({
  isOpen,
  onClose,
  onSave,
  editingArea,
}: StorageAreaModalProps) {
  const { companyId } = useAppContext();
  const [name, setName] = useState('');
  const [division, setDivision] = useState<string>('__none__'); // Use sentinel value for "None"
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or editing area changes
  useEffect(() => {
    if (isOpen) {
      if (editingArea) {
        setName(editingArea.name);
        setDivision(editingArea.division || '__none__');
        setDescription(editingArea.description || '');
      } else {
        setName('');
        setDivision('__none__');
        setDescription('');
      }
      setError(null);
    } else {
      // Reset state when modal closes to prevent stale values
      setName('');
      setDivision('__none__');
      setDescription('');
      setError(null);
    }
  }, [editingArea, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!companyId) {
      setError('Company ID not available');
      setSaving(false);
      return;
    }

    const areaData = {
      name: name.trim(),
      division: division === '__none__' ? null : division,
      description: description.trim() || null,
    };

    try {
      if (editingArea) {
        // Update existing storage area
        const { error: updateError } = await supabase
          .from('storage_areas')
          .update(areaData)
          .eq('id', editingArea.id);

        if (updateError) throw updateError;
        toast.success('Storage area updated successfully');
      } else {
        // Create new storage area
        const { error: insertError } = await supabase
          .from('storage_areas')
          .insert({
            ...areaData,
            company_id: companyId,
          });

        if (insertError) throw insertError;
        toast.success('Storage area created successfully');
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving storage area:', err);
      
      // Handle duplicate name error
      if (err.code === '23505') {
        setError('A storage area with this name already exists');
      } else {
        setError(err.message || 'An error occurred while saving');
      }
    } finally {
      setSaving(false);
    }
  };

  // Ensure division is always a valid string
  const divisionValue = division || '__none__';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900 dark:text-white">
            {editingArea ? 'Edit Storage Area' : 'Add Storage Area'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-white/60">
            {editingArea 
              ? 'Update the storage area details below'
              : 'Create a new physical storage location for stock counting'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-white">
              Name <span className="text-red-600 dark:text-red-400">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Cellar, Dry Store, Walk-in Fridge"
              required
              className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>

          {/* Division Field */}
          <div className="space-y-2">
            <Label htmlFor="division" className="text-sm font-medium text-gray-900 dark:text-white">
              Division
            </Label>
            <select
              id="division"
              value={divisionValue}
              onChange={(e) => setDivision(e.target.value || '__none__')}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 min-w-[180px] appearance-none cursor-pointer"
            >
              <option value="__none__">None</option>
              {STORAGE_DIVISIONS.map((div) => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-white/50">
              Optional: helps group areas for reporting
            </p>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-white">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this storage area..."
              className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus-visible:ring-emerald-500/50 dark:focus-visible:ring-emerald-500 focus-visible:border-emerald-600 dark:focus-visible:border-emerald-500 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !name.trim()}
              className="bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-700 text-white min-w-[100px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

