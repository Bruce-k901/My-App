'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from '@/components/ui/icons';
import { portalToOverlayRoot } from '@/lib/overlay-portal';

interface StaffOption {
  id: string;
  full_name: string;
  position_title: string | null;
  avatar_url: string | null;
}

interface ShiftInfo {
  shift_date: string;
  start_time: string;
  end_time: string;
  role_required: string | null;
  section_name?: string | null;
}

interface StaffPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStaff: (staffId: string) => void;
  staff: StaffOption[];
  shiftInfo?: ShiftInfo | null;
}

const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const min = m !== '00' ? `:${m}` : '';
  return `${hour > 12 ? hour - 12 : hour}${min}${hour >= 12 ? 'pm' : 'am'}`;
};

export function StaffPickerSheet({
  isOpen,
  onClose,
  onSelectStaff,
  staff,
  shiftInfo,
}: StaffPickerSheetProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      s =>
        s.full_name.toLowerCase().includes(q) ||
        (s.position_title && s.position_title.toLowerCase().includes(q))
    );
  }, [staff, search]);

  function handleSelect(staffId: string) {
    onSelectStaff(staffId);
    setSearch('');
    onClose();
  }

  function handleClose() {
    setSearch('');
    onClose();
  }

  return portalToOverlayRoot(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[59]"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-[rgb(var(--surface-elevated))] border-t border-black/10 dark:border-white/10 rounded-t-2xl max-h-[80vh] flex flex-col"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-theme-primary">Assign Staff</h3>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-5 h-5 text-theme-tertiary" />
                </button>
              </div>

              {shiftInfo && (
                <div className="text-sm text-theme-tertiary">
                  {new Date(shiftInfo.shift_date + 'T00:00:00').toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  {' · '}
                  {formatTime(shiftInfo.start_time)} - {formatTime(shiftInfo.end_time)}
                  {shiftInfo.role_required && ` · ${shiftInfo.role_required}`}
                  {shiftInfo.section_name && ` · ${shiftInfo.section_name}`}
                </div>
              )}

              {/* Search */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full pl-9 pr-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] border border-black/15 dark:border-white/[0.1] rounded-lg text-sm text-theme-primary placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:border-module-fg/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Staff list */}
            <div
              className="overflow-y-auto flex-1 px-4 py-2"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              {filtered.length === 0 ? (
                <div className="text-center text-theme-tertiary text-sm py-8">
                  {search ? 'No staff match your search' : 'No staff available'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelect(s.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors"
                    >
                      {/* Avatar */}
                      {s.avatar_url ? (
                        <img
                          src={s.avatar_url}
                          alt={s.full_name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-theme-tertiary text-sm font-medium flex-shrink-0">
                          {s.full_name.charAt(0)}
                        </div>
                      )}

                      {/* Name + role */}
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium text-theme-primary truncate">
                          {s.full_name}
                        </div>
                        {s.position_title && (
                          <div className="text-xs text-theme-tertiary truncate">
                            {s.position_title}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
