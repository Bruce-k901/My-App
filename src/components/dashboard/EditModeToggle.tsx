'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical } from '@/components/ui/icons';
import { useDashboardPreferencesContext } from '@/context/DashboardPreferencesContext';
import { cn } from '@/lib/utils';

export function EditModeToggle() {
  const { isEditMode, setEditMode } = useDashboardPreferencesContext();

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setEditMode(!isEditMode)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all',
          isEditMode
            ? 'bg-teamly/10 text-teamly border border-teamly/30'
            : 'bg-black/[0.03] dark:bg-white/[0.03] border border-module-fg/[0.12] text-[rgb(var(--text-disabled))] hover:text-[rgb(var(--text-primary))]'
        )}
      >
        <GripVertical className="w-3.5 h-3.5" />
        {isEditMode ? 'Done' : 'Edit Layout'}
      </button>

      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 rounded-lg bg-teamly/5 border border-teamly/20 text-[11px] text-teamly overflow-hidden"
          >
            Drag to reorder, click size button to resize. Click &quot;Done&quot; when finished.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EditModeToggle;
