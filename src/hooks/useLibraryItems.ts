import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { LibraryType, LibraryItem, LibraryItemInput } from '@/types/library.types';
import { getTableName } from '@/lib/utils/libraryHelpers';

export function useLibraryItems(libraryType: LibraryType) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { companyId, userId } = useAppContext();
  
  const tableName = getTableName(libraryType);
  
  const fetchItems = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
        
      if (fetchError) {
        console.error(`Error fetching ${libraryType}:`, fetchError);
        setError(fetchError.message);
        return;
      }
      
      setItems(data || []);
    } catch (err) {
      console.error(`Error in fetchItems for ${libraryType}:`, err);
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [tableName, libraryType, companyId]);
  
  const addItem = async (item: LibraryItemInput): Promise<boolean> => {
    if (!companyId || !userId) return false;
    
    try {
      const { data, error: insertError } = await supabase
        .from(tableName)
        .insert([{ 
          ...item, 
          company_id: companyId,
          created_by: userId,
          updated_by: userId,
        }])
        .select()
        .single();
        
      if (insertError) {
        console.error(`Error adding ${libraryType} item:`, insertError);
        setError(insertError.message);
        return false;
      }
      
      setItems(prev => [data, ...prev]);
      return true;
    } catch (err) {
      console.error(`Error in addItem for ${libraryType}:`, err);
      setError('Failed to add item');
      return false;
    }
  };
  
  const updateItem = async (id: string, changes: Partial<LibraryItem>): Promise<boolean> => {
    if (!companyId || !userId) return false;
    
    try {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          ...changes,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId);
        
      if (updateError) {
        console.error(`Error updating ${libraryType} item:`, updateError);
        setError(updateError.message);
        return false;
      }
      
      setItems(prev => 
        prev.map(item => item.id === id ? { ...item, ...changes } : item)
      );
      return true;
    } catch (err) {
      console.error(`Error in updateItem for ${libraryType}:`, err);
      setError('Failed to update item');
      return false;
    }
  };
  
  const deleteItem = async (id: string): Promise<boolean> => {
    if (!companyId) return false;
    
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);
        
      if (deleteError) {
        console.error(`Error deleting ${libraryType} item:`, deleteError);
        setError(deleteError.message);
        return false;
      }
      
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      console.error(`Error in deleteItem for ${libraryType}:`, err);
      setError('Failed to delete item');
      return false;
    }
  };
  
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  return { 
    items, 
    loading, 
    error,
    addItem, 
    updateItem, 
    deleteItem, 
    refetch: fetchItems 
  };
}

