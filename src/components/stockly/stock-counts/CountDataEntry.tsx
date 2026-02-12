'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StockCountItem, LibraryType } from '@/lib/types/stockly';
import { CheckCircle, Loader2, Save, ArrowRight, ArrowUp } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';

interface CountDataEntryProps {
  countId: string;
  items: StockCountItem[];
  librariesIncluded: LibraryType[];
  onUpdate: () => void;
}

// Library order for print sheets (same order as librariesIncluded array)
const getLibraryOrder = (libType: LibraryType, librariesIncluded: LibraryType[]): number => {
  const index = librariesIncluded.indexOf(libType);
  return index >= 0 ? index : 999;
};

export default function CountDataEntry({
  countId,
  items,
  librariesIncluded,
  onUpdate,
}: CountDataEntryProps) {
  const { companyId } = useAppContext();
  const [selectedLibrary, setSelectedLibrary] = useState<LibraryType | null>(null);

  // REMOVED: Debug useEffect was causing re-renders
  
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savingLibrary, setSavingLibrary] = useState<LibraryType | null>(null); // Track which library is being saved
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  const getLibraryName = (type: LibraryType): string => {
    // Handle both formats: 'ingredients' and 'ingredients_library'
    const normalizedType = type?.toLowerCase().replace('_library', '') || '';
    
    switch (normalizedType) {
      case 'ingredients': return 'Ingredients';
      case 'packaging': return 'Packaging';
      case 'foh': return 'FOH Items';
      case 'first_aid': return 'First Aid';
      case 'firstaid': return 'First Aid';
      case 'ppe': return 'PPE';
      case 'chemicals': return 'Chemicals';
      case 'disposables': return 'Disposables';
      case 'glassware': return 'Glassware';
      case 'drinks': return 'Drinks';
      case 'serving_equipment': return 'Serving Equipment';
      case 'servingequipment': return 'Serving Equipment';
      default: 
        // If we don't recognize it, format it nicely
        return type
          ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : 'Unknown';
    }
  };

  // Filter items by selected library (must have a library selected)
  const filteredItems = selectedLibrary 
    ? items.filter(item => item.library_type === selectedLibrary)
    : [];

  // Sort items to match print sheet order:
  // 1. By library type (same order as librariesIncluded)
  // 2. Then alphabetically by name
  const sortedItems = [...filteredItems].sort((a, b) => {
    // First sort by library order
    const aLibOrder = getLibraryOrder(a.library_type, librariesIncluded);
    const bLibOrder = getLibraryOrder(b.library_type, librariesIncluded);
    if (aLibOrder !== bLibOrder) {
      return aLibOrder - bLibOrder;
    }
    
    // Then alphabetically by name
    const aName = (a.ingredient as any)?.ingredient_name || 
                  (a.ingredient as any)?.name || '';
    const bName = (b.ingredient as any)?.ingredient_name || 
                  (b.ingredient as any)?.name || '';
    return aName.localeCompare(bName);
  });

  // REMOVED: Auto-focus is causing cursor jumping issues
  // Users can manually click the first input if needed

  const handleCountChange = (itemId: string, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSaveCount = async (item: StockCountItem, value?: string) => {
    // Use provided value, or fall back to editingValues, or existing counted_quantity
    const countValue = (value?.trim() || editingValues[item.id]?.trim() || item.counted_quantity?.toString() || '').trim();
    if (!countValue) {
      return; // Don't save empty values
    }

    const countedQty = parseFloat(countValue);
    if (isNaN(countedQty)) {
      return; // Don't save invalid numbers
    }

    setSaving(item.id);

    const theoreticalClosing = item.theoretical_closing || 0;
    const variance = countedQty - theoreticalClosing;
    const variancePercentage = theoreticalClosing !== 0 
      ? (variance / theoreticalClosing) * 100 
      : 0;
    const varianceValue = variance * (item.unit_cost || 0);

    // Note: variance_quantity and variance_value are GENERATED columns in the database
    // They are automatically calculated as (counted_quantity - expected_quantity) and 
    // ((counted_quantity - expected_quantity) * unit_cost) respectively.
    // We should NOT send them in the UPDATE - PostgreSQL will calculate them automatically.
    const { error } = await supabase
      .from('stock_count_items')
      .update({
        counted_quantity: countedQty,
        // variance_quantity: variance, // REMOVED - this is a GENERATED column
        variance_percentage: variancePercentage,
        // variance_value: varianceValue, // REMOVED - this is a GENERATED column
        status: 'counted',
        is_counted: true, // Set is_counted for stockly schema trigger
        counted_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      console.error('Error saving count:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Item being saved:', { id: item.id, countedQty, variance, variancePercentage, varianceValue });
      toast.error(`Failed to save count: ${error.message || 'Unknown error'}`);
    } else {
      // Clear the editing value
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[item.id];
        return newValues;
      });
      onUpdate();
    }

    setSaving(null);
  };

  // Save all items in a library that have values in editingValues
  const handleSaveLibrary = async (libraryType: LibraryType, libraryItems: StockCountItem[], moveToNextEmpty = false) => {
    setSavingLibrary(libraryType);
    
    try {
      // Find all items in this library that have values in editingValues
      const itemsToSave = libraryItems.filter(item => {
        const value = editingValues[item.id]?.trim() || '';
        return value && !isNaN(parseFloat(value));
      });

      if (itemsToSave.length === 0) {
        setSavingLibrary(null);
        // If no items to save but we want to move to next empty, do that
        if (moveToNextEmpty) {
          moveToNextEmptyLine(libraryItems);
        }
        return;
      }

      // Save all items in parallel
      const savePromises = itemsToSave.map(item => {
        const countValue = editingValues[item.id]?.trim() || '';
        const countedQty = parseFloat(countValue);
        
        const theoreticalClosing = item.theoretical_closing || 0;
        const variance = countedQty - theoreticalClosing;
        const variancePercentage = theoreticalClosing !== 0 
          ? (variance / theoreticalClosing) * 100 
          : 0;
        const varianceValue = variance * (item.unit_cost || 0);

        return supabase
          .from('stock_count_items')
          .update({
            counted_quantity: countedQty,
            variance_quantity: variance,
            variance_percentage: variancePercentage,
            variance_value: varianceValue,
            status: 'counted',
            counted_at: new Date().toISOString(),
          })
          .eq('id', item.id);
      });

      await Promise.all(savePromises);

      // Clear saved values from editingValues
      setEditingValues(prev => {
        const newValues = { ...prev };
        itemsToSave.forEach(item => {
          delete newValues[item.id];
        });
        return newValues;
      });

      // Refresh data
      onUpdate();

      // If requested, move to next empty line after save completes
      if (moveToNextEmpty) {
        // Wait for onUpdate to trigger re-render and update items
        // Then find next empty item from updated sortedItems
        setTimeout(() => {
          moveToNextEmptyLine();
        }, 300);
      }
    } catch (error) {
      console.error('Error saving library counts:', error);
    } finally {
      setSavingLibrary(null);
    }
  };

  // Find and focus the next empty line (no value entered and not counted)
  const moveToNextEmptyLine = () => {
    if (!selectedLibrary) return;

    // Use sortedItems which will be updated after onUpdate() re-render
    // Find the first item that has no value in editingValues and is not counted
    const nextEmptyItem = sortedItems.find(item => {
      const hasEditingValue = editingValues[item.id]?.trim();
      const hasCountedQuantity = item.counted_quantity;
      const isCounted = item.status === 'counted';
      // Empty if: no editing value, no counted quantity, and not marked as counted
      return !hasEditingValue && !hasCountedQuantity && !isCounted;
    });

    if (nextEmptyItem) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const nextInput = inputRefs.current[nextEmptyItem.id];
        if (nextInput) {
          // Scroll into view smoothly
          nextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Focus after scroll completes
          setTimeout(() => {
            if (nextInput.offsetParent !== null) {
              nextInput.focus();
              nextInput.select();
            }
          }, 400);
        }
      });
    }
  };

  // Handle floating save and move to next empty
  const handleSaveAndMove = async () => {
    if (!selectedLibrary) return;
    
    // Get current library items
    const currentLibraryItems = sortedItems;
    
    // Save and move to next empty
    await handleSaveLibrary(selectedLibrary, currentLibraryItems, true);
  };

  // Handle saving ALL items across ALL libraries
  const handleSaveAll = async () => {
    // Find all items across all libraries that have values in editingValues
    const allItemsToSave = sortedItems.filter(item => {
      const value = editingValues[item.id]?.trim() || '';
      return value && !isNaN(parseFloat(value));
    });

    if (allItemsToSave.length === 0) {
      toast.info('No changes to save');
      return;
    }

    // Save all items in parallel
    const savePromises = allItemsToSave.map(item => {
      const countValue = editingValues[item.id]?.trim() || '';
      const countedQty = parseFloat(countValue);
      
      const theoreticalClosing = item.theoretical_closing || 0;
      const variance = countedQty - theoreticalClosing;
      const variancePercentage = theoreticalClosing !== 0 
        ? (variance / theoreticalClosing) * 100 
        : 0;
      const varianceValue = variance * (item.unit_cost || 0);

      return supabase
        .from('stock_count_items')
        .update({
          counted_quantity: countedQty,
          variance_quantity: variance,
          variance_percentage: variancePercentage,
          variance_value: varianceValue,
          status: 'counted',
          counted_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    });

    try {
      await Promise.all(savePromises);

      // Clear saved values from editingValues
      setEditingValues(prev => {
        const newValues = { ...prev };
        allItemsToSave.forEach(item => {
          delete newValues[item.id];
        });
        return newValues;
      });

      // Refresh data
      onUpdate();

      toast.success(`Successfully saved ${allItemsToSave.length} item${allItemsToSave.length !== 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Error saving all items:', error);
      toast.error(`Failed to save items: ${error.message || 'Unknown error'}`);
    }
  };

  // Scroll to top of page
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Tab/Enter navigation - Excel-like behavior (no auto-save, just navigation)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>, 
    currentItem: StockCountItem, 
    currentIndexInLibrary: number,
    allItemsInCurrentView: StockCountItem[]
  ) => {
    // CRITICAL: Verify allItemsInCurrentView only contains items from selectedLibrary
    if (!selectedLibrary) {
      // No library selected - can't navigate
      return;
    }
    const wrongLibraryItems = allItemsInCurrentView.filter(i => i.library_type !== selectedLibrary);
    if (wrongLibraryItems.length > 0) {
      console.error('FATAL: allItemsInCurrentView contains wrong library items!', {
        selectedLibrary,
        wrongItems: wrongLibraryItems.map(i => ({ id: i.id, library_type: i.library_type })),
        allItemsLength: allItemsInCurrentView.length,
        currentItemLibrary: currentItem.library_type
      });
      // Don't navigate if array is corrupted
      return;
    }
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      
      // Capture current input value and store in state (don't save yet - too slow)
      const inputValue = (e.currentTarget as HTMLInputElement).value?.trim() || '';
      if (inputValue) {
        setEditingValues(prev => ({
          ...prev,
          [currentItem.id]: inputValue,
        }));
      }

      // Move to next item immediately (Excel-like behavior - fast navigation)
      // CRITICAL: Only navigate within allItemsInCurrentView array
      const nextIndex = currentIndexInLibrary + 1;
      if (nextIndex < allItemsInCurrentView.length) {
        const nextItem = allItemsInCurrentView[nextIndex];
        
        // CRITICAL SAFETY CHECK: Verify nextItem exists and is in the array
        if (!nextItem) {
          console.error('Navigation error: nextItem is null', { nextIndex, arrayLength: allItemsInCurrentView.length });
          e.currentTarget.blur();
          return;
        }
        
        // CRITICAL: Verify nextItem is actually at the expected index
        if (allItemsInCurrentView[nextIndex]?.id !== nextItem.id) {
          console.error('Navigation error: nextItem index mismatch', { 
            nextIndex, 
            expectedId: allItemsInCurrentView[nextIndex]?.id,
            actualId: nextItem.id,
            arrayLength: allItemsInCurrentView.length 
          });
          e.currentTarget.blur();
          return;
        }
        
        const nextInput = inputRefs.current[nextItem.id];
        if (!nextInput) {
          console.warn('Next input ref not found', { nextItemId: nextItem.id, nextItemLibrary: nextItem.library_type });
          e.currentTarget.blur();
          return;
        }
        
        // CRITICAL: Verify nextItem belongs to the correct library
        // This is the KEY fix - prevent navigation to items from other libraries
        if (selectedLibrary && nextItem.library_type !== selectedLibrary) {
          console.error('BLOCKED: Next item is from wrong library!', {
            nextItemId: nextItem.id,
            nextItemLibrary: nextItem.library_type,
            selectedLibrary,
            currentItemLibrary: currentItem.library_type,
            allItemsInCurrentViewLength: allItemsInCurrentView.length,
            allItemsInCurrentViewLibraries: allItemsInCurrentView.map(i => i.library_type)
          });
          e.currentTarget.blur();
          return;
        }
        
        // CRITICAL: Verify the input is actually visible in the DOM
        // Check if input is in a visible tbody (not hidden by library filtering)
        const inputRow = nextInput.closest('tr');
        const inputTbody = nextInput.closest('tbody');
        const isVisible = inputRow && inputTbody && 
                         nextInput.offsetParent !== null && 
                         inputRow.offsetParent !== null;
        
        if (!isVisible) {
          console.warn('Next input not visible in DOM', { 
            nextItemId: nextItem.id, 
            nextItemLibrary: nextItem.library_type,
            selectedLibrary,
            hasRow: !!inputRow,
            hasTbody: !!inputTbody,
            inputVisible: nextInput.offsetParent !== null,
            rowVisible: inputRow?.offsetParent !== null
          });
          e.currentTarget.blur();
          return;
        }
        
        // All checks passed - navigate to next input
        // NO SAVING - just navigation
        const nextItemId = nextItem.id;
        
        // Navigate immediately - no saving during navigation
        requestAnimationFrame(() => {
          const nextInputElement = inputRefs.current[nextItemId];
          if (nextInputElement && nextInputElement.offsetParent !== null) {
            nextInputElement.focus();
            nextInputElement.select(); // Select all text for easy replacement
          }
        });
      } else {
        // Reached the end of current view - blur current input
        e.currentTarget.blur();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Move to next item with arrow down
      const nextIndex = currentIndexInLibrary + 1;
      if (nextIndex < allItemsInCurrentView.length) {
        const nextItem = allItemsInCurrentView[nextIndex];
        if (!nextItem) return;
        const nextInput = inputRefs.current[nextItem.id];
        if (nextInput && nextInput.offsetParent !== null) {
          requestAnimationFrame(() => {
            if (nextInput && nextInput.offsetParent !== null) {
              nextInput.focus();
              nextInput.select();
            }
          });
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Move to previous item with arrow up
      const prevIndex = currentIndexInLibrary - 1;
      if (prevIndex >= 0) {
        const prevItem = allItemsInCurrentView[prevIndex];
        if (!prevItem) return;
        const prevInput = inputRefs.current[prevItem.id];
        if (prevInput && prevInput.offsetParent !== null) {
          requestAnimationFrame(() => {
            if (prevInput && prevInput.offsetParent !== null) {
              prevInput.focus();
              prevInput.select();
            }
          });
        }
      }
    }
  };

  // Calculate progress for current library
  const pendingCount = sortedItems.filter(i => i.status === 'pending').length;
  const countedCount = sortedItems.filter(i => i.status === 'counted').length;
  
  // Calculate overall progress
  const totalItems = items.length;
  const totalCounted = items.filter(i => i.status === 'counted').length;

  // ALWAYS derive libraries from actual items (more reliable than librariesIncluded)
  // Memoize to prevent re-calculating on every render
  const availableLibraries = useMemo(() => {
    const itemLibraryTypes = Array.from(new Set(items.map(i => i.library_type).filter(Boolean))) as LibraryType[];
    return itemLibraryTypes.length > 0 
      ? itemLibraryTypes 
      : (librariesIncluded.length > 0 ? librariesIncluded : []);
  }, [items.length, librariesIncluded.length, librariesIncluded.join(',')]);

  // Get library stats - always show all libraries that have items
  // Memoize to prevent re-calculating on every render
  const libraryStats = useMemo(() => {
    return availableLibraries.map(libType => {
      const libItems = items.filter(i => i.library_type === libType);
      const libCounted = libItems.filter(i => i.status === 'counted').length;
      return {
        type: libType,
        name: getLibraryName(libType),
        total: libItems.length,
        counted: libCounted,
      };
    }).filter(stat => stat.total > 0); // Only show libraries that have items
  }, [availableLibraries, items.length]);

  // Auto-select first library ONLY once when availableLibraries first becomes available
  const hasAutoSelectedRef = useRef(false);
  const availableLibrariesLength = availableLibraries?.length || 0;
  
  useEffect(() => {
    // Only run once - check ref to prevent re-running
    if (hasAutoSelectedRef.current) return;
    
    if (availableLibrariesLength > 0 && !selectedLibrary && availableLibraries.length > 0) {
      setSelectedLibrary(availableLibraries[0]);
      hasAutoSelectedRef.current = true;
    }
    // Use only primitive values to keep dependency array stable - same size every render
  }, [availableLibrariesLength, selectedLibrary]);

  // REMOVED: Debug useEffect was causing re-renders

  // Always show only the selected library (no 'all' view)
  const itemsByLibrary = selectedLibrary ? { [selectedLibrary]: sortedItems } : {};

  return (
    <div className="space-y-6">
      {/* Library Tabs - Always Visible and Prominent */}
      <div className="bg-theme-surface border-2 border-module-fg/30 dark:border-module-fg/30 rounded-lg p-4 shadow-lg">
        <div className="mb-3">
          <h3 className="text-base font-bold text-theme-primary mb-1">Select Library to Count</h3>
          <p className="text-xs text-theme-secondary">Choose a library to enter count data</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {libraryStats.length > 0 ? (
            libraryStats.map((stat) => (
              <button
                key={stat.type}
                onClick={() => {
                  console.log('Selecting library:', stat.type);
                  setSelectedLibrary(stat.type);
                }}
                className={`px-5 py-3 rounded-lg text-sm font-semibold transition-all min-w-[140px] ${
                  selectedLibrary === stat.type
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                    : 'bg-gray-100 dark:bg-white/[0.05] text-theme-secondary hover:bg-gray-200 dark:hover:bg-white/10 border-2 border-theme'
                }`}
              >
                {stat.name} ({stat.counted}/{stat.total})
              </button>
            ))
          ) : availableLibraries.length === 0 && librariesIncluded.length > 0 ? (
            // Fallback: Show library buttons from librariesIncluded even if items don't have library_type yet
            librariesIncluded.map((libType) => {
              const libItems = items.filter(i => i.library_type === libType);
              const libCounted = libItems.filter(i => i.status === 'counted').length;
              return (
                <button
                  key={libType}
                  onClick={() => {
                    console.log('Selecting library from librariesIncluded:', libType);
                    setSelectedLibrary(libType);
                  }}
                  className={`px-5 py-3 rounded-lg text-sm font-semibold transition-all min-w-[140px] ${
                    selectedLibrary === libType
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-gray-100 dark:bg-white/[0.05] text-theme-secondary hover:bg-gray-200 dark:hover:bg-white/10 border-2 border-theme'
                  }`}
                >
                  {getLibraryName(libType)} ({libCounted}/{libItems.length})
                </button>
              );
            })
          ) : availableLibraries.length === 0 ? (
            <div className="px-4 py-2 text-sm text-amber-700 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-500/10 rounded border border-amber-200 dark:border-amber-500/30">
              ⚠️ No library types found in items. Check that items have library_type set.
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-theme-tertiary italic">
              No items found for selected libraries
            </div>
          )}
        </div>
      </div>

      {/* Save All Button - Global save for all libraries */}
      {(() => {
        const allItemsWithChanges = sortedItems.filter(item => {
          const value = editingValues[item.id]?.trim() || '';
          return value && !isNaN(parseFloat(value));
        });
        return allItemsWithChanges.length > 0 && (
          <div className="mb-4 flex justify-end">
            <Button
              onClick={handleSaveAll}
              disabled={savingLibrary !== null}
              loading={savingLibrary !== null}
              variant="primary"
              className="bg-module-fg hover:bg-module-fg/90 text-white shadow-lg"
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              Save All ({allItemsWithChanges.length} items)
            </Button>
          </div>
        );
      })()}

      {/* Keyboard Shortcuts - Front and Center */}
      <div className="bg-emerald-50 dark:bg-emerald-600/20 border-2 border-emerald-500 dark:border-emerald-400 rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <kbd className="px-3 py-1.5 bg-white dark:bg-white/10 border-2 border-emerald-600 dark:border-emerald-400 rounded-md text-emerald-700 dark:text-emerald-300 font-bold text-sm shadow-md">
                Enter
              </kbd>
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                → Next Item
              </span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-3 py-1.5 bg-white dark:bg-white/10 border-2 border-emerald-600 dark:border-emerald-400 rounded-md text-emerald-700 dark:text-emerald-300 font-bold text-sm shadow-md">
                ↓ ↑
              </kbd>
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                Navigate
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-theme-secondary font-medium">
              Overall Progress:
            </span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold text-base">
              {totalCounted}/{totalItems} ({totalItems > 0 ? Math.round((totalCounted / totalItems) * 100) : 0}%)
            </span>
          </div>
        </div>
        <div className="w-full bg-emerald-200 dark:bg-emerald-900/30 rounded-full h-2 mt-3">
          <div
            className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: totalItems > 0 
                ? `${(totalCounted / totalItems) * 100}%` 
                : '0%' 
            }}
          />
        </div>
      </div>

      {/* Library Sections */}
      {(() => {
        // Always show only the selected library (no 'all' view)
        // itemsByLibrary is: { [selectedLibrary]: sortedItems }
        const libraryEntries = Object.entries(itemsByLibrary);
        
        return libraryEntries.map(([libType, libItems]) => {
          const libTypeTyped = libType as LibraryType;
          const libCounted = libItems.filter(i => i.status === 'counted').length;
          const libProgress = libItems.length > 0 ? Math.round((libCounted / libItems.length) * 100) : 0;

          return (
          <div key={libType} className="space-y-3">
            {/* Table for this library */}
            <div className="bg-theme-surface border border-theme rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-theme-button border-b border-theme">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-secondary">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-theme-secondary">
                        Expected
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-theme-secondary w-48">
                        Count
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-theme-secondary w-16">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                    {libItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-theme-tertiary">
                          No items found
                        </td>
                      </tr>
                    ) : (
                      libItems.map((item, localIndex) => {
                        const ingredientName = (item.ingredient as any)?.ingredient_name || 
                                             (item.ingredient as any)?.name || 
                                             'Unknown';
                        const currentCountValue = editingValues[item.id] !== undefined
                          ? editingValues[item.id]
                          : (item.counted_quantity?.toString() || '');
                        const isCounted = item.status === 'counted';
                        // Use local index within current library section for navigation

                        return (
                          <tr 
                            key={item.id}
                            className={`hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] ${
                              isCounted ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-theme-primary font-medium">
                                  {ingredientName}
                                </span>
                                {(item.ingredient as any)?.supplier && (
                                  <span className="text-xs text-theme-tertiary">
                                    Supplier: {(item.ingredient as any)?.supplier}
                                  </span>
                                )}
                                {(item.ingredient as any)?.pack_size && (
                                  <span className="text-xs text-theme-tertiary">
                                    Case Size: {(item.ingredient as any)?.pack_size}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-theme-secondary text-sm">
                                {item.theoretical_closing || 0} {item.unit_of_measurement || ''}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  ref={(el) => {
                                    if (el) inputRefs.current[item.id] = el;
                                  }}
                                  type="number"
                                  step="0.01"
                                  value={currentCountValue}
                                  onChange={(e) => handleCountChange(item.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    // CRITICAL: Verify item is from the correct library
                                    if (selectedLibrary && item.library_type !== selectedLibrary) {
                                      console.error('Item library mismatch!', { 
                                        itemLibraryType: item.library_type, 
                                        selectedLibrary,
                                        itemId: item.id 
                                      });
                                      return; // Don't navigate if library mismatch
                                    }
                                    
                                    // Verify libItems only contains items from the selected library
                                    if (selectedLibrary) {
                                      const wrongLibraryItems = libItems.filter(i => i.library_type !== selectedLibrary);
                                      if (wrongLibraryItems.length > 0) {
                                        console.error('libItems contains wrong library items!', { 
                                          selectedLibrary,
                                          wrongItems: wrongLibraryItems.map(i => ({ id: i.id, library_type: i.library_type })),
                                          libItemsLength: libItems.length
                                        });
                                      }
                                    }
                                    
                                    // Use localIndex from map instead of findIndex - it's more reliable
                                    // localIndex is the actual position in the rendered array
                                    handleKeyDown(e, item, localIndex, libItems);
                                  }}
                                  onFocus={(e) => {
                                    // Select all text on focus for easy replacement (Excel-like)
                                    e.target.select();
                                  }}
                                  placeholder="Press Enter to continue..."
                                  autoComplete="off"
                                  disabled={saving === item.id}
 className="bg-theme-surface ] border-theme text-theme-primary focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-500 disabled:opacity-50"
                                />
                                <span className="text-theme-tertiary text-sm whitespace-nowrap">
                                  {item.unit_of_measurement || ''}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isCounted && (
                                <CheckCircle className="h-5 w-5 text-module-fg mx-auto" />
                              )}
                              {saving === item.id && (
                                <Loader2 className="h-5 w-5 text-module-fg animate-spin mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Manual Save Button for this Library */}
            <div className="flex justify-end pt-4 pb-2">
              <Button
                onClick={() => handleSaveLibrary(libTypeTyped, libItems)}
                disabled={savingLibrary === libTypeTyped || libItems.filter(item => {
                  const value = editingValues[item.id]?.trim() || '';
                  return value && !isNaN(parseFloat(value));
                }).length === 0}
                loading={savingLibrary === libTypeTyped}
                variant="primary"
                className="bg-module-fg hover:bg-module-fg/90 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Save {getLibraryName(libTypeTyped)} Counts
                {libItems.filter(item => {
                  const value = editingValues[item.id]?.trim() || '';
                  return value && !isNaN(parseFloat(value));
                }).length > 0 && (
                  <span className="ml-2 text-sm opacity-90">
                    ({libItems.filter(item => {
                      const value = editingValues[item.id]?.trim() || '';
                      return value && !isNaN(parseFloat(value));
                    }).length} items)
                  </span>
                )}
              </Button>
            </div>
          </div>
          );
        });
      })()}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <strong>Tip:</strong> Select a library tab above to focus on counting items from that library. Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded text-xs text-theme-secondary">Tab</kbd> or <kbd className="px-1.5 py-0.5 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded text-xs text-theme-secondary">Enter</kbd> to move to the next item. Click the "Save" button at the bottom of each library section when you're ready to save your counts.
        </p>
      </div>

      {/* Floating Action Buttons */}
      {selectedLibrary && sortedItems.length > 0 && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
          {/* Back to Top Button */}
          <Button
            onClick={handleScrollToTop}
            className="bg-module-fg hover:bg-module-fg/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-4 py-3 flex items-center justify-center w-12 h-12"
            title="Scroll to top of page"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
          
          {/* Save & Move Button */}
          <Button
            onClick={handleSaveAndMove}
            disabled={savingLibrary === selectedLibrary || sortedItems.filter(item => {
              const value = editingValues[item.id]?.trim() || '';
              return value && !isNaN(parseFloat(value));
            }).length === 0}
            loading={savingLibrary === selectedLibrary}
            className="bg-module-fg hover:bg-module-fg/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-6 py-3 flex items-center gap-2"
            title="Save progress and move to next empty line"
          >
            <Save className="h-5 w-5" />
            <span className="font-semibold">Save & Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
