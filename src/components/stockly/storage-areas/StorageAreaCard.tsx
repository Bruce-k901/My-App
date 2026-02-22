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
    <div className="bg-theme-surface border border-theme rounded-xl p-6 hover:border-emerald-600 dark:hover:border-module-fg/30 transition-all duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-theme-primary mb-2">
            {area.name}
          </h3>
          
          {area.division && (
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-module-fg/20 text-module-fg border border-emerald-200 dark:border-module-fg/30 text-sm font-medium mb-3">
              {area.division}
            </div>
          )}
          
          {area.description && (
            <p className="text-theme-secondary text-sm mb-3 leading-relaxed">
              {area.description}
            </p>
          )}
          
          <div className="flex items-center text-theme-secondary text-sm">
            <Package className="h-4 w-4 mr-2 text-module-fg" />
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
            className="text-theme-secondary hover:text-module-fg dark:hover:text-module-fg hover:bg-module-fg/10"
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-theme-secondary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-600/10"
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

