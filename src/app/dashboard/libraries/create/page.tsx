"use client";

import React, { useState } from 'react';
import { Plus, Trash2, Save, Eye, X, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import CheckboxCustom from '@/components/ui/CheckboxCustom';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'INTEGER', label: 'Integer' },
  { value: 'NUMERIC', label: 'Number (Decimal)' },
  { value: 'BOOLEAN', label: 'Yes/No' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIMESTAMP', label: 'Date & Time' },
  { value: 'CATEGORY', label: 'Category (Dropdown)' },
];

interface LibraryField {
  id: string;
  name: string;
  column: string;
  type: string;
  required: boolean;
  main_table: boolean;
  default_value: string;
  category_options?: string[];
  min?: number;
  max?: number;
}

export default function CreateLibraryPage() {
  const { companyId, userId } = useAppContext();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [libraryName, setLibraryName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<LibraryField[]>([
    {
      id: '1',
      name: 'Item Name',
      column: 'item_name',
      type: 'TEXT',
      required: true,
      main_table: true,
      default_value: '',
    }
  ]);

  const sanitizeColumnName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  };

  const generateTableName = (): string => {
    if (!libraryName) return '';
    return sanitizeColumnName(libraryName) + '_library';
  };

  const addField = () => {
    const newId = Date.now().toString();
    setFields([
      ...fields,
      {
        id: newId,
        name: '',
        column: '',
        type: 'TEXT',
        required: false,
        main_table: false,
        default_value: '',
      }
    ]);
  };

  const removeField = (id: string) => {
    if (fields.length === 1) {
      console.warn('Cannot remove the last field');
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<LibraryField>) => {
    setFields(fields.map(f => {
      if (f.id === id) {
        const updated = { ...f, ...updates };
        // Auto-generate column name from name
        if (updates.name !== undefined && !updates.column) {
          updated.column = sanitizeColumnName(updates.name);
        }
        return updated;
      }
      return f;
    }));
  };

  const generateSQL = (): string => {
    const tableName = generateTableName();
    if (!tableName) return '';

    let sql = `-- ============================================\n`;
    sql += `-- Create ${tableName} Table\n`;
    sql += `-- Generated Library Request\n`;
    sql += `-- ============================================\n\n`;
    
    sql += `DROP TABLE IF EXISTS ${tableName} CASCADE;\n\n`;
    sql += `CREATE TABLE ${tableName} (\n`;
    sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,\n`;

    fields.forEach((field, index) => {
      if (!field.name || !field.column) return;
      
      let columnDef = `  ${field.column} `;
      
      switch (field.type) {
        case 'TEXT':
        case 'TEXTAREA':
        case 'CATEGORY':
          columnDef += 'TEXT';
          break;
        case 'INTEGER':
          columnDef += 'INTEGER';
          break;
        case 'NUMERIC':
          columnDef += 'NUMERIC(10, 2)';
          break;
        case 'BOOLEAN':
          columnDef += 'BOOLEAN';
          break;
        case 'DATE':
          columnDef += 'DATE';
          break;
        case 'TIMESTAMP':
          columnDef += 'TIMESTAMPTZ';
          break;
        default:
          columnDef += 'TEXT';
      }

      if (field.required) {
        columnDef += ' NOT NULL';
      }

      if (field.type === 'BOOLEAN' && field.default_value) {
        columnDef += ` DEFAULT ${field.default_value === 'true' ? 'true' : 'false'}`;
      } else if (field.default_value && field.type !== 'BOOLEAN') {
        columnDef += ` DEFAULT '${field.default_value.replace(/'/g, "''")}'`;
      }

      sql += columnDef;
      if (index < fields.length - 1 || fields.some(f => f.name && f.column)) {
        sql += ',';
      }
      sql += '\n';
    });

    sql += `  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n`;
    sql += `  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n`;
    sql += `);\n\n`;

    // Indexes
    sql += `-- Indexes\n`;
    sql += `CREATE INDEX IF NOT EXISTS idx_${tableName.replace('_library', '')}_company_id ON ${tableName}(company_id);\n`;
    fields.filter(f => f.main_table && f.name && f.column).forEach(field => {
      sql += `CREATE INDEX IF NOT EXISTS idx_${tableName.replace('_library', '')}_${field.column} ON ${tableName}(${field.column});\n`;
    });
    sql += '\n';

    // Triggers
    sql += `-- Updated_at Trigger\n`;
    sql += `CREATE OR REPLACE FUNCTION update_${tableName}_updated_at()\n`;
    sql += `RETURNS TRIGGER AS $$\n`;
    sql += `BEGIN\n`;
    sql += `  NEW.updated_at = NOW();\n`;
    sql += `  RETURN NEW;\n`;
    sql += `END;\n`;
    sql += `$$ LANGUAGE plpgsql;\n\n`;
    sql += `CREATE TRIGGER trigger_update_${tableName}_updated_at\n`;
    sql += `  BEFORE UPDATE ON ${tableName}\n`;
    sql += `  FOR EACH ROW\n`;
    sql += `  EXECUTE FUNCTION update_${tableName}_updated_at();\n\n`;

    // RLS Policies
    sql += `-- RLS Policies\n`;
    sql += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
    sql += `CREATE POLICY "Users can view ${tableName} from their own company"\n`;
    sql += `  ON ${tableName} FOR SELECT\n`;
    sql += `  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));\n\n`;
    sql += `CREATE POLICY "Users can create ${tableName} for their own company"\n`;
    sql += `  ON ${tableName} FOR INSERT\n`;
    sql += `  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));\n\n`;
    sql += `CREATE POLICY "Users can update ${tableName} from their own company"\n`;
    sql += `  ON ${tableName} FOR UPDATE\n`;
    sql += `  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));\n\n`;
    sql += `CREATE POLICY "Users can delete ${tableName} from their own company"\n`;
    sql += `  ON ${tableName} FOR DELETE\n`;
    sql += `  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));\n\n`;
    sql += `-- Permissions\n`;
    sql += `GRANT SELECT, INSERT, UPDATE, DELETE ON ${tableName} TO authenticated;\n`;

    return sql;
  };

  const handleSubmit = async () => {
    if (!libraryName.trim()) {
      alert('Please enter a library name');
      return;
    }

    const validFields = fields.filter(f => f.name && f.column);
    if (validFields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    if (!companyId || !userId) {
      alert('Missing company or user context');
      return;
    }

    try {
      setLoading(true);
      
      const generatedSQL = generateSQL();
      const mainTableColumns = fields.filter(f => f.main_table && f.name && f.column).map(f => f.column);
      const categoryOptions: string[] = [];
      
      fields.forEach(field => {
        if (field.type === 'CATEGORY' && field.category_options) {
          categoryOptions.push(...field.category_options);
        }
      });

      const fieldsJSON = validFields.map(f => ({
        name: f.name,
        column: f.column,
        type: f.type,
        required: f.required,
        main_table: f.main_table,
        default: f.default_value || null,
        category_options: f.type === 'CATEGORY' ? f.category_options : null,
        min: f.min || null,
        max: f.max || null,
      }));

      const { data, error } = await supabase
        .from('library_requests')
        .insert({
          company_id: companyId,
          requested_by: userId,
          library_name: libraryName.trim(),
          table_name: generateTableName(),
          description: description.trim() || null,
          fields: fieldsJSON,
          main_table_columns: mainTableColumns.length > 0 ? mainTableColumns : null,
          category_options: categoryOptions.length > 0 ? categoryOptions : null,
          generated_sql: generatedSQL,
          enable_csv_import: true,
          enable_csv_export: true,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;

      console.info('Library request submitted successfully');
      router.push('/dashboard/libraries/my-requests');
      
    } catch (error: any) {
      console.error('Error submitting library request:', error);
      alert(`Error: ${error.message || 'Failed to submit request'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
            <div>
              <h1 className="text-lg font-semibold text-white">Create Custom Library</h1>
              <p className="text-sm text-neutral-400">Design a new library and request it to be created</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-neutral-600 hover:border-neutral-500 rounded-lg text-white hover:bg-white/5 transition flex items-center gap-2"
          >
            <Eye size={16} />
            {showPreview ? 'Hide' : 'Show'} SQL Preview
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-magenta-500/10 to-blue-500/10 border border-magenta-500/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span className="text-magenta-400">📚</span> How It Works
        </h2>
        <div className="space-y-3 text-sm text-neutral-300">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-magenta-500/20 text-magenta-400 flex items-center justify-center text-xs font-semibold">1</span>
            <p>
              <strong className="text-white">Design your library:</strong> Give it a name and add the fields you need (like Item Name, Cost, Supplier, etc.)
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-magenta-500/20 text-magenta-400 flex items-center justify-center text-xs font-semibold">2</span>
            <p>
              <strong className="text-white">Configure fields:</strong> Set field types (Text, Number, etc.), mark required fields, and choose which ones appear in the main table view
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-magenta-500/20 text-magenta-400 flex items-center justify-center text-xs font-semibold">3</span>
            <p>
              <strong className="text-white">Submit your request:</strong> Review the generated SQL (optional) and submit. Checkly will review your request
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-magenta-500/20 text-magenta-400 flex items-center justify-center text-xs font-semibold">4</span>
            <p>
              <strong className="text-white">Get notified:</strong> You'll receive notifications when your request is approved and when your library is ready to use
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-magenta-500/20">
          <p className="text-xs text-neutral-400">
            💡 <strong className="text-neutral-300">Tip:</strong> Start with an "Item Name" field (already added) and build from there. You can always add more fields later once the library is created.
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Library Name *</label>
            <input
              type="text"
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              placeholder="e.g., Equipment Spares"
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2 text-white"
            />
            {libraryName && (
              <p className="text-xs text-neutral-500 mt-1">
                Table name: <code className="bg-neutral-900 px-1 rounded">{generateTableName()}</code>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this library will be used for..."
              rows={3}
              className="w-full bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* Fields Builder */}
      <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Fields</h2>
          <button
            onClick={addField}
            className="px-3 py-1.5 border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] transition rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Add Field
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-neutral-900/50 border border-neutral-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-neutral-400 text-sm">
                  <GripVertical size={16} />
                  Field {index + 1}
                </div>
                {fields.length > 1 && (
                  <button
                    onClick={() => removeField(field.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Field Name *</label>
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    placeholder="e.g., Part Number"
                    className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Column Name</label>
                  <input
                    type="text"
                    value={field.column}
                    onChange={(e) => updateField(field.id, { column: sanitizeColumnName(e.target.value) })}
                    placeholder="Auto-generated"
                    className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Type *</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Options</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <CheckboxCustom
                        checked={field.required}
                        onChange={(checked) => updateField(field.id, { required: checked })}
                        size={18}
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <CheckboxCustom
                        checked={field.main_table}
                        onChange={(checked) => updateField(field.id, { main_table: checked })}
                        size={18}
                      />
                      Main Table
                    </label>
                  </div>
                </div>

                {field.type === 'CATEGORY' && (
                  <div className="md:col-span-2 lg:col-span-4">
                    <label className="block text-xs text-neutral-400 mb-1">Category Options (one per line)</label>
                    <textarea
                      value={field.category_options?.join('\n') || ''}
                      onChange={(e) => updateField(field.id, {
                        category_options: e.target.value.split('\n').filter(s => s.trim())
                      })}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      rows={3}
                      className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                    />
                  </div>
                )}

                {(field.type === 'INTEGER' || field.type === 'NUMERIC') && (
                  <>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Min Value</label>
                      <input
                        type="number"
                        value={field.min || ''}
                        onChange={(e) => updateField(field.id, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Max Value</label>
                      <input
                        type="number"
                        value={field.max || ''}
                        onChange={(e) => updateField(field.id, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                      />
                    </div>
                  </>
                )}

                {field.type !== 'BOOLEAN' && field.type !== 'DATE' && field.type !== 'TIMESTAMP' && (
                  <div className="md:col-span-2 lg:col-span-4">
                    <label className="block text-xs text-neutral-400 mb-1">Default Value</label>
                    <input
                      type="text"
                      value={field.default_value}
                      onChange={(e) => updateField(field.id, { default_value: e.target.value })}
                      placeholder="Optional"
                      className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                    />
                  </div>
                )}

                {field.type === 'BOOLEAN' && (
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Default Value</label>
                    <select
                      value={field.default_value}
                      onChange={(e) => updateField(field.id, { default_value: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-white text-sm"
                    >
                      <option value="">No default</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SQL Preview */}
      {showPreview && (
        <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Generated SQL Preview</h2>
          <pre className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 overflow-x-auto text-xs text-neutral-300 font-mono">
            {generateSQL() || 'Enter library name and add fields to see SQL preview'}
          </pre>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-neutral-600 hover:border-neutral-500 rounded-lg text-white hover:bg-white/5 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !libraryName.trim() || fields.filter(f => f.name && f.column).length === 0}
          className="px-6 py-2 border border-magenta-500/60 text-magenta-400 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-magenta-400 hover:shadow-[0_0_14px_rgba(233,0,126,0.55)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-magenta-500/60 transition rounded-lg flex items-center gap-2"
        >
          <Save size={16} />
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}
