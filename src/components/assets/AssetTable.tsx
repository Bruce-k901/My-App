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
        .from('assets_redundant')
        .select(`
          id,
          label,
          code,
          model,
          serial_number,
          date_of_purchase,
          warranty_length_years,
          under_warranty,
          next_service_due,
          add_to_ppm
        `)
        .order('label', { ascending: true });

      if (error) console.error(error);
      else setAssets(data || []);
    };

    fetchAssets();
  }, []);

  const refreshAssets = async () => {
    const { data, error } = await supabase
      .from('assets_redundant')
      .select(`
        id,
        label,
        code,
        model,
        serial_number,
        date_of_purchase,
        warranty_length_years,
        under_warranty,
        next_service_due,
        add_to_ppm
      `)
      .order('label', { ascending: true });
    if (error) console.error(error);
    else setAssets(data || []);
  };

  const saveLabel = async (id: string) => {
    const newLabel = editValue.trim();
    const { error } = await supabase
      .from('assets_redundant')
      .update({ label: newLabel || null })
      .eq('id', id);
    if (error) {
      console.error('Failed to update label', error);
      alert(error.message || 'Could not update asset label');
      return;
    }
    setEditId(null);
    setEditValue('');
    await refreshAssets();
  };

  return (
    <table className="min-w-full text-sm text-neutral-200">
      <thead className="border-b border-neutral-700 text-neutral-400">
        <tr>
          <th className="py-2 text-left">Item</th>
          <th className="text-left">Model</th>
          <th className="text-left">Serial</th>
          <th className="text-left">Purchase</th>
          <th className="text-left">Warranty</th>
          <th className="text-left">Next Service</th>
          <th className="text-left">PPM</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((a) => (
          <tr key={a.id} className="border-b border-neutral-800 hover:bg-neutral-800/40">
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
                    className="rounded bg-neutral-800 border border-neutral-700 text-white text-sm px-2 py-1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="(unnamed asset)"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="text-xs px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-700"
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
                  className={a.label ? '' : 'text-neutral-500'}
                  title={a.label ? 'Double-click to edit label' : 'Double-click to set label'}
                >
                  {a.label || a.code || '(unnamed asset)'}
                </span>
              )}
            </td>
            <td>{a.model}</td>
            <td>{a.serial_number}</td>
            <td>{a.date_of_purchase}</td>
            <td>
              {a.under_warranty ? 'Under Warranty' : `${a.warranty_length_years} yr`}
            </td>
            <td>{a.next_service_due || '-'}</td>
            <td>{a.add_to_ppm ? 'Yes' : 'No'}</td>
          </tr>
        ))}
        {assets.length === 0 && (
          <tr>
            <td colSpan={7} className="py-4 text-center text-neutral-500">
              No assets yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}