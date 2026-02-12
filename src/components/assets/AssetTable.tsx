'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AssetTable() {
  const [assets, setAssets] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    const fetchAssets = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          model,
          serial_number,
          brand,
          category,
          contractor:contractors(id, name, phone, email),
          site:sites(id, name),
          install_date,
          next_service_date,
          warranty_end,
          status,
          notes
        `)
        .order('name', { ascending: true });

      if (error) console.error(error);
      else setAssets(data || []);
    };

    fetchAssets();
  }, []);

  const refreshAssets = async () => {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        id,
        name,
        model,
        serial_number,
        brand,
        category,
        contractor:contractors(id, name, phone, email),
        site:sites(id, name),
        install_date,
        next_service_date,
        warranty_end,
        status,
        notes
      `)
      .order('name', { ascending: true });
    if (error) console.error(error);
    else setAssets(data || []);
  };

  const saveLabel = async (id: string) => {
    const newLabel = editValue.trim();
    const { error } = await supabase
      .from('assets')
      .update({ name: newLabel || null })
      .eq('id', id);
    if (error) {
      console.error('Failed to update name', error);
      alert(error.message || 'Could not update asset name');
      return;
    }
    setEditId(null);
    setEditValue('');
    await refreshAssets();
  };

  return (
    <table className="min-w-full text-sm text-gray-700 dark:text-neutral-200">
 <thead className="bg-gray-50 dark:bg-transparent border-b border-theme text-gray-500 dark:text-theme-tertiary">
        <tr>
          <th className="py-2 text-left">Item</th>
          <th className="text-left">Model</th>
          <th className="text-left">Serial</th>
          <th className="text-left">Brand</th>
          <th className="text-left">Install Date</th>
          <th className="text-left">Warranty End</th>
          <th className="text-left">Next Service</th>
          <th className="text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((a) => (
          <tr key={a.id} className="border-b border-gray-200 dark:border-neutral-800 hover:bg-theme-surface-elevated dark:hover:bg-neutral-800/40">
            <td className="py-2">
              {editId === a.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveLabel(a.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    className="rounded bg-theme-surface border border-gray-300 dark:border-theme text-theme-primary text-sm px-2 py-1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="(unnamed asset)"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-theme-secondary"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-theme-surface border border-gray-300 dark:border-theme text-theme-secondary"
                    onClick={() => {
                      setEditId(null);
                      setEditValue('');
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <span
                  onDoubleClick={() => {
                    setEditId(a.id);
                    setEditValue(a.label || '');
                  }}
 className={a.label ?'text-theme-primary':'text-gray-400 dark:text-theme-tertiary'}
                  title={a.label ? 'Double-click to edit label' : 'Double-click to set label'}
                >
                  {a.name || '(unnamed asset)'}
                </span>
              )}
            </td>
            <td className="text-gray-700 dark:text-neutral-200">{a.model}</td>
            <td className="text-gray-700 dark:text-neutral-200">{a.serial_number}</td>
            <td className="text-gray-700 dark:text-neutral-200">{a.brand}</td>
            <td className="text-gray-700 dark:text-neutral-200">{a.install_date}</td>
            <td className="text-gray-700 dark:text-neutral-200">
              {a.warranty_end ? new Date(a.warranty_end).toLocaleDateString() : '-'}
            </td>
            <td className="text-gray-700 dark:text-neutral-200">{a.next_service_date ? new Date(a.next_service_date).toLocaleDateString() : '-'}</td>
            <td className="text-gray-700 dark:text-neutral-200">{a.status || 'Active'}</td>
          </tr>
        ))}
        {assets.length === 0 && (
          <tr>
 <td colSpan={8} className="py-4 text-center text-gray-400 dark:text-theme-tertiary">
              No assets yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}