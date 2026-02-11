'use client';

import { StorageArea } from '@/lib/types/stockly';
import Button from '@/components/ui/Button';
import { Edit, Trash2, Package, Loader2 } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { toast } from 'sonner';

interface StorageAreaCardProps {
  area: StorageArea;
  onEdit: (area: StorageArea) => void;
  onDelete: () => void;
}

export default function StorageAreaCard({ 
  area, 
  onEdit, 
  onDelete 
}: StorageAreaCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    // Check if area has ingredients assigned
    if (area.ingredient_count && area.ingredient_count > 0) {
      const confirmMsg = `"${area.name}" has ${area.ingredient_count} ingredient(s) assigned. Delete anyway? (Ingredients won't be deleted, just unassigned from this area)`;
      if (!confirm(confirmMsg)) return;
    } else {
      if (!confirm(`Delete storage area "${area.name}"?`)) return;
    }

    setDeleting(true);
    
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('storage_areas')
        .update({ is_active: false })
        .eq('id', area.id);

      if (error) {
        console.error('Error deleting storage area:', error);
        toast.error('Error deleting storage area. Please try again.');
      } else {
        toast.success('Storage area deleted successfully');
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting storage area:', error);
      toast.error('Error deleting storage area. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6 hover:border-emerald-600 dark:hover:border-emerald-500/50 transition-all duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {area.name}
          </h3>
          
          {area.division && (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-sm font-medium mb-3">
              {area.division}
            </div>
          )}
          
          {area.description && (
            <p className="text-gray-600 dark:text-white/60 text-sm mb-3 leading-relaxed">
              {area.description}
            </p>
          )}
          
          <div className="flex items-center text-gray-600 dark:text-white/60 text-sm">
            <Package className="h-4 w-4 mr-2 text-emerald-600 dark:text-emerald-400" />
            <span>
              {area.ingredient_count || 0} ingredient{area.ingredient_count !== 1 ? 's' : ''} assigned
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(area)}
            className="text-gray-600 dark:text-white/60 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-600/10"
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-600 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-600/10"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

